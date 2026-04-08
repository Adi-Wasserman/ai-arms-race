/**
 * Helpers for the "% Owned" and "Chip Mix" columns shown in both
 * Race section views (Leaderboard sidebar + OwnershipTable).
 *
 * % Owned uses LAB_OWNERSHIP_CONFIG to determine which Epoch AI
 * chip-owner names a lab directly owns. The calculation:
 *
 *   1. Sum the median H100e from the live Epoch ZIP for the
 *      lab's `selfOwned` owner names.
 *   2. Divide by the lab's effective fleet (from `seriesFull` at
 *      today's date), cap at 100%.
 *   3. If `selfOwned` is empty, fall through to `overridePct` —
 *      currently only Anthropic (transition case).
 *
 * Chip Mix = manufacturer-level rollup of the latest cumulative
 * snapshot from the Epoch AI Chip Owners ZIP. Owned by `chipOwnersSlice`
 * via the `useEpochChipOwners` hook. Returned as a sorted list of
 * `{ manufacturer, pct, h100e, color }` so the consumer can render
 * it as a tiny stacked bar with at most 5-6 colors.
 */

import { LAB_OWNERSHIP_CONFIG } from '@/config/labOwnershipMapping';
import type { ChipManufacturer, EpochChipOwnersData, Lab } from '@/types';

/* ─────────────────────────────────────────────────────────────
   Lab → Epoch Owner mapping (inverse of OWNER_TO_LAB).
   Used to look up an Epoch chip-owners snapshot for a tracked lab.
   ───────────────────────────────────────────────────────────── */

export const LAB_TO_OWNER: Readonly<Record<Lab, string>> = {
  OpenAI: 'Microsoft',
  Anthropic: 'Amazon',
  Gemini: 'Google',
  Meta: 'Meta',
  xAI: 'xAI',
};

/* ─────────────────────────────────────────────────────────────
   Manufacturer color palette — calm, family-coordinated.
   Each manufacturer occupies its own hue family so the tiny
   leaderboard chip-mix bars are still readable at narrow widths
   without confusing them with the existing lab colors.
   ───────────────────────────────────────────────────────────── */

export const MFR_COLORS: Readonly<Record<ChipManufacturer | 'Unknown', string>> = {
  Nvidia: '#3fa14d', //   green   — Nvidia association
  Google: '#2c6ed1', //   royal blue — Google brand
  Amazon: '#d57e2a', //   burnt orange — AWS brand
  AMD: '#b8453a', //      brick red
  Huawei: '#8456b8', //   medium purple
  Unknown: '#7a7a7a',
};

/** Order of manufacturer segments in the bar — most-common first. */
const MFR_DISPLAY_ORDER: readonly (ChipManufacturer | 'Unknown')[] = [
  'Nvidia',
  'Google',
  'Amazon',
  'AMD',
  'Huawei',
  'Unknown',
];

/* ─────────────────────────────────────────────────────────────
   "% Owned" — Epoch-derived hybrid.

   See LAB_OWNERSHIP_CONFIG for the per-lab structural mapping.

   Numerator = sum of median H100e from the live Epoch ZIP for
               every owner name listed in `selfOwned`.
   Denominator = lab's effective fleet (caller passes this in
               from seriesFull at today's date).
   Cap at 100% — a lab can never own MORE than its full fleet,
   but rounding + the fact that an Epoch owner like "Google"
   includes all Google chips (not just Gemini's slice) can push
   the raw ratio above 1.0.

   When `selfOwned` is empty, fall through to `overridePct`:
   - OpenAI override = 0   (pure cloud tenant on Microsoft/Oracle)
   - Anthropic override = 25 (transition — Trainium in flight)
   - everyone else has selfOwned entries, no override needed
   ───────────────────────────────────────────────────────────── */

export interface PctOwnedResult {
  /** 0-100, integer. */
  pct: number;
  /** Absolute H100e from the Epoch ZIP that drove the numerator. */
  ownedH100e: number;
  /** True when `pct` was computed from live Epoch data. */
  isDerivedFromEpoch: boolean;
  /** Optional caveat shown beside the value (e.g. "override"). */
  footnote?: string;
}

export function computePctOwned(
  lab: Lab,
  totalFleetH100e: number,
  chipOwners: EpochChipOwnersData | null,
): PctOwnedResult {
  const config = LAB_OWNERSHIP_CONFIG[lab];
  if (!config) {
    return { pct: 0, ownedH100e: 0, isDerivedFromEpoch: false };
  }

  // ── Override path (selfOwned empty) ──
  if (config.selfOwned.length === 0) {
    if (config.overridePct === undefined) {
      return {
        pct: 0,
        ownedH100e: 0,
        isDerivedFromEpoch: false,
        footnote: 'No first-party chip ownership',
      };
    }
    const pct = clampPct(config.overridePct);
    return {
      pct,
      ownedH100e: Math.round((totalFleetH100e * pct) / 100),
      isDerivedFromEpoch: false,
      footnote:
        pct === 0
          ? 'Pure cloud tenant — no first-party chip ownership'
          : 'Manual override (transition case — see footer)',
    };
  }

  // ── Derived path (sum selfOwned chip-owner totals) ──
  if (!chipOwners) {
    return {
      pct: 0,
      ownedH100e: 0,
      isDerivedFromEpoch: false,
      footnote: 'Loading Epoch chip owners…',
    };
  }

  let ownedH100e = 0;
  for (const ownerName of config.selfOwned) {
    const snap = chipOwners.latestByOwner.find((s) => s.owner === ownerName);
    if (snap) ownedH100e += snap.h100e;
  }

  if (totalFleetH100e <= 0) {
    return { pct: 0, ownedH100e, isDerivedFromEpoch: true };
  }
  const rawPct = (ownedH100e / totalFleetH100e) * 100;
  const pct = clampPct(rawPct);

  return {
    pct,
    ownedH100e,
    isDerivedFromEpoch: true,
    footnote:
      pct === 100 && rawPct > 110
        ? `Capped at 100% (raw ratio ${Math.round(rawPct)}% — Epoch owner total exceeds lab fleet because the chip-owner row covers all uses of those chips, not just this lab's slice)`
        : undefined,
  };
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ─────────────────────────────────────────────────────────────
   Chip Mix — manufacturer-level rollup
   ───────────────────────────────────────────────────────────── */

export interface ManufacturerSegment {
  manufacturer: string;
  /** % share of this manufacturer in the owner's H100e total. */
  pct: number;
  /** Absolute H100e attributed to this manufacturer. */
  h100e: number;
  /** Display color (one of MFR_COLORS). */
  color: string;
}

/**
 * Look up a lab's Epoch owner snapshot and return its chip-mix
 * grouped by manufacturer. Returns `null` when:
 *   - chipOwners hasn't loaded yet
 *   - the lab has no LAB_TO_OWNER entry
 *   - the owner has no snapshot in the dataset
 */
export function computeManufacturerMix(
  lab: Lab,
  chipOwners: EpochChipOwnersData | null,
): ManufacturerSegment[] | null {
  if (!chipOwners) return null;
  const ownerName = LAB_TO_OWNER[lab];
  if (!ownerName) return null;
  const snapshot = chipOwners.latestByOwner.find((s) => s.owner === ownerName);
  if (!snapshot || snapshot.h100e <= 0) return null;

  const sums = new Map<string, number>();
  for (const c of snapshot.byChipType) {
    sums.set(c.manufacturer, (sums.get(c.manufacturer) ?? 0) + c.h100e);
  }

  // Sort by display order, then drop manufacturers with 0% share.
  const total = snapshot.h100e;
  const segments: ManufacturerSegment[] = [];
  const seen = new Set<string>();
  for (const mfr of MFR_DISPLAY_ORDER) {
    const sum = sums.get(mfr);
    if (sum && sum > 0) {
      seen.add(mfr);
      segments.push({
        manufacturer: mfr,
        pct: (sum / total) * 100,
        h100e: sum,
        color: MFR_COLORS[mfr] ?? MFR_COLORS.Unknown,
      });
    }
  }
  // Catch any manufacturers we didn't anticipate (future Epoch additions).
  for (const [mfr, sum] of sums) {
    if (seen.has(mfr) || sum <= 0) continue;
    segments.push({
      manufacturer: mfr,
      pct: (sum / total) * 100,
      h100e: sum,
      color: MFR_COLORS.Unknown,
    });
  }

  return segments;
}

/* ─────────────────────────────────────────────────────────────
   Raw "Owned H100e (Epoch)" — no denominator, no overrides.

   Distinct from computePctOwned's `ownedH100e` field because:
   1. No override fallthrough. OpenAI / Anthropic always return
      0 — by design. They use the % Owned override because
      Epoch attributes their chips to the hyperscalers, not to
      the labs themselves.
   2. Propagates the 5th/95th Monte Carlo range alongside the
      median so the cell tooltip can surface it.
   ───────────────────────────────────────────────────────────── */

export interface OwnedH100eResult {
  /** Sum of `h100e` medians from `selfOwned` Epoch owner rows. */
  median: number;
  /** Sum of 5th-percentile values (Monte Carlo lower bound). */
  low: number;
  /** Sum of 95th-percentile values (Monte Carlo upper bound). */
  high: number;
  /** True when at least one selfOwned row matched a snapshot. */
  isDerivedFromEpoch: boolean;
  /** Epoch owner names that contributed to the sum. */
  sources: readonly string[];
}

export function computeOwnedH100e(
  lab: Lab,
  chipOwners: EpochChipOwnersData | null,
): OwnedH100eResult {
  const empty: OwnedH100eResult = {
    median: 0,
    low: 0,
    high: 0,
    isDerivedFromEpoch: false,
    sources: [],
  };
  const config = LAB_OWNERSHIP_CONFIG[lab];
  if (!config || !chipOwners || config.selfOwned.length === 0) return empty;

  let median = 0;
  let low = 0;
  let high = 0;
  const sources: string[] = [];
  for (const name of config.selfOwned) {
    const snap = chipOwners.latestByOwner.find((s) => s.owner === name);
    if (snap) {
      median += snap.h100e;
      low += snap.h100eLow;
      high += snap.h100eHigh;
      sources.push(name);
    }
  }
  return {
    median,
    low,
    high,
    isDerivedFromEpoch: median > 0,
    sources,
  };
}
