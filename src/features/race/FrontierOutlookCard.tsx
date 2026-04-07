import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import { PCT_OWNED_FOOTNOTE } from '@/config/labOwnershipMapping';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { computePctOwned, type PctOwnedResult } from '@/services/ownershipMath';
import { useDashboard } from '@/store';
import type { Lab } from '@/types';

import styles from './FrontierOutlookCard.module.css';

/* ─────────────────────────────────────────────────────────────
   "Frontier Leadership Outlook" — collapsible summary card.

   Sits above the main toggle row when scope=fleet. Ranks the
   5 frontier labs by % Owned (the only ownership metric the
   Epoch ZIP + our hybrid mapping can support honestly without
   inventing absolute owned-H100e numbers for cloud tenants).

   Editorial framing matches the established discipline of the
   OwnershipSidePanel: do not report a per-lab owned H100e for
   labs whose chips are operated by a hyperscaler. Sparklines
   are shown only for self-operated labs (Gemini, Meta, xAI)
   — for OpenAI and Anthropic we display "N/A — cloud-dependent".
   ───────────────────────────────────────────────────────────── */

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const EPOCH_BLOG_URL =
  'https://epoch.ai/blog/introducing-the-ai-chip-owners-explorer';

/**
 * Static one-line "data proof" for each lab. These describe the
 * structural reason behind each lab's ownership posture — they
 * deliberately don't restate the live percentages (which appear
 * in the adjacent column).
 */
const PROOF_LINES: Readonly<Record<Lab, string>> = {
  Gemini: 'largest self-operated TPU fleet (Google owns the silicon and the data centers)',
  Meta: 'full control of Hyperion + Prometheus — own data centers, own Nvidia chips',
  xAI: 'most vertically integrated pure-play lab — built and operates Colossus 1+2',
  Anthropic: 'transition phase — Trainium2 in flight + first owned sites coming online',
  OpenAI: 'fully cloud-dependent (Microsoft Stargate / Azure + Oracle)',
};

/**
 * Which Epoch chip-owner row to source the sparkline from.
 * Only the 3 self-operated labs get one — for OpenAI / Anthropic
 * the operator (Microsoft / Amazon) chip-totals would represent
 * the hyperscaler's own buildout, not the lab's ownership trend,
 * and plotting them as if they were the lab's curve would be
 * exactly the kind of over-attribution the OwnershipSidePanel
 * was designed to avoid.
 */
const SPARKLINE_OWNER: Partial<Record<Lab, string>> = {
  Gemini: 'Google',
  Meta: 'Meta',
  xAI: 'xAI',
};

interface RankedLab {
  lab: Lab;
  pct: number;
  ownedH100e: number;
  isDerivedFromEpoch: boolean;
  proof: string;
  sparkline: number[] | null;
}

export function FrontierOutlookCard(): JSX.Element | null {
  const [open, setOpen] = useState(true);

  // Reactive store reads — re-renders when these change.
  const dataVersion = useDashboard((s) => s.dataVersion);
  const chipOwners = useDashboard((s) => s.chipOwners);
  const chipOwnersVersion = useDashboard((s) => s.chipOwnersVersion);
  const raceMode = useDashboard((s) => s.raceMode);

  const ranked = useMemo<RankedLab[] | null>(() => {
    if (!chipOwners) return null;

    const state = useDashboard.getState();
    const fullPast = state.seriesFull.filter((x) => x.date <= TODAY_ISO);
    const fullPt = fullPast.length > 0 ? fullPast[fullPast.length - 1] : null;
    if (!fullPt) return null;

    // Build a "since 2022" sparkline series per Epoch owner once,
    // then look it up below — avoids quadratic filter calls.
    const since2022 = chipOwners.timeseries.filter(
      (p) => p.endDate >= '2022-01-01',
    );
    const sparklineFor = (ownerName: string): number[] =>
      since2022.map((p) => p.byOwner[ownerName] ?? 0);

    const rows: RankedLab[] = LAB_NAMES.map((lab): RankedLab => {
      const result: PctOwnedResult = computePctOwned(
        lab,
        fullPt[lab],
        chipOwners,
      );
      const sparkOwner = SPARKLINE_OWNER[lab];
      const series = sparkOwner ? sparklineFor(sparkOwner) : null;
      return {
        lab,
        pct: result.pct,
        ownedH100e: result.ownedH100e,
        isDerivedFromEpoch: result.isDerivedFromEpoch,
        proof: PROOF_LINES[lab],
        sparkline: series && series.length > 1 ? series : null,
      };
    });

    // Sort by % desc, then by raw owned H100e (Epoch median) as the
    // tiebreaker so Gemini (Google: ~2× Meta's chips) ranks above Meta
    // when both round to 100%.
    rows.sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return b.ownedH100e - a.ownedH100e;
    });

    return rows;
    // chipOwnersVersion + dataVersion drive recompute when the underlying
    // ZIP / Epoch CSV refreshes. The chipOwners object reference itself
    // is stable across updates, so we depend on the version stamp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, chipOwnersVersion]);

  return (
    <section className={styles.card} aria-labelledby="frontier-outlook-title">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.toggleBtn}
          aria-expanded={open}
          aria-controls="frontier-outlook-body"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.chevron} aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <h3 id="frontier-outlook-title" className={styles.title}>
            Who is positioned to lead frontier models in 2027+?
          </h3>
        </button>
        <div className={styles.headerRight}>
          <span className={styles.modeIndicator}>
            Currently viewing:{' '}
            <strong>
              {raceMode === 'ownership' ? 'OWNERSHIP' : 'ACCESS'}
            </strong>
          </span>
          <a
            className={styles.infoIcon}
            href={EPOCH_BLOG_URL}
            target="_blank"
            rel="noreferrer"
            title="Source: Epoch AI Chip Owners Explorer (opens in new tab)"
            aria-label="About the data source — Epoch AI Chip Owners Explorer"
          >
            ⓘ
          </a>
        </div>
      </header>

      {open && (
        <div id="frontier-outlook-body" className={styles.body}>
          <p className={styles.lede}>
            <strong>Access leaders</strong> (OpenAI, Anthropic) currently
            dominate frontier model releases. Labs with the highest{' '}
            <strong>% hardware ownership</strong> (Gemini, Meta, xAI) have
            the strongest strategic moat for sustained scaling beyond 2027,
            per Epoch AI's ownership data.
          </p>

          {ranked == null ? (
            <div className={styles.skeleton}>Loading Epoch chip owners…</div>
          ) : (
            <ol className={styles.list}>
              {ranked.map((r, i) => {
                const color = LAB_COLORS[r.lab];
                const star = !r.isDerivedFromEpoch ? '*' : '';
                return (
                  <li
                    key={r.lab}
                    className={styles.row}
                    style={{ '--row-color': color } as CSSProperties}
                  >
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.labName} style={{ color }}>
                      {r.lab}
                    </span>
                    <span className={styles.pct}>
                      <strong>{r.pct}%</strong>
                      <span className={styles.pctLabel}>owned{star}</span>
                    </span>
                    <span className={styles.proof}>→ {r.proof}</span>
                    <span className={styles.sparkSlot}>
                      {r.sparkline ? (
                        <Sparkline values={r.sparkline} color={color} />
                      ) : (
                        <span
                          className={styles.sparkNa}
                          title="No direct ownership trend — Epoch tracks the operator (Microsoft / Amazon), not the lab"
                        >
                          N/A — cloud-dependent
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <p className={styles.footnote}>
            <strong>*</strong> OpenAI and Anthropic values use the documented
            override because they rent from hyperscalers (Epoch explicitly
            states they own almost none of the chips they use). Compute
            remains the dominant scaling driver (4–5×/year per Epoch), but
            algorithms, data, and talent also matter — see the{' '}
            <a href="#models">Models view</a> for latest releases.
            <span className={styles.footnoteMuted}>{PCT_OWNED_FOOTNOTE}</span>
          </p>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── Sparkline ───────────────────────── */

interface SparklineProps {
  values: number[];
  color: string;
}

/**
 * Tiny inline SVG sparkline. Normalizes to its own min/max so the
 * shape of each lab's growth is visible regardless of absolute scale.
 * The min/max normalization is intentional: the point is to show the
 * trajectory of self-operated buildout, not to compare absolute fleet
 * sizes (the % Owned column already does that).
 */
function Sparkline({ values, color }: SparklineProps): JSX.Element {
  const W = 84;
  const H = 22;
  const PAD = 1.5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (W - PAD * 2) / Math.max(1, values.length - 1);

  const points = values
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastIdx = values.length - 1;
  const lastX = PAD + lastIdx * stepX;
  const lastY = H - PAD - ((values[lastIdx] - min) / span) * (H - PAD * 2);

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label="Ownership trend since 2022"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <circle cx={lastX} cy={lastY} r="1.6" fill={color} />
    </svg>
  );
}
