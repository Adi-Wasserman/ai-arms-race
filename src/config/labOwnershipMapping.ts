/**
 * Hardware-ownership configuration for the Race section's "% Owned"
 * column. The column shows what fraction of each lab's effective
 * fleet is hardware they directly own — vs hardware they rent from
 * a hosting operator (Microsoft, AWS, GCP, etc.).
 *
 * The data flows two ways:
 *
 * 1. `selfOwned` — list of Epoch AI Chip Owners CSV `Owner` names
 *    where the LAB ITSELF is the direct owning entity. We sum the
 *    median H100e from those owner rows in the live ZIP and divide
 *    by the lab's effective fleet from `seriesFull`.
 *
 * 2. `overridePct` — used only for transition cases where the lab
 *    isn't yet a clean Epoch owner-row entity but we still want to
 *    surface a meaningful number. As of 2026-Q1 the only override
 *    is Anthropic, which is funding Trainium purchases via AWS but
 *    isn't tracked as a standalone owner in Epoch's CSV yet.
 *
 * Order of resolution in `computePctOwned()`:
 *   selfOwned has entries → derived from Epoch (numerator = sum,
 *                            denominator = lab fleet, capped at 100)
 *   selfOwned empty + overridePct set → use override
 *   selfOwned empty + no override → 0% (pure cloud tenant)
 */

import type { Lab } from '@/types';

export interface LabOwnershipConfig {
  /** Epoch chip-owner names that this lab directly owns. */
  selfOwned: readonly string[];
  /**
   * Hand-coded percentage for transition cases. Only consulted when
   * `selfOwned` is empty. Set to undefined for a pure 0% result.
   */
  overridePct?: number;
}

export const LAB_OWNERSHIP_CONFIG: Readonly<Record<Lab, LabOwnershipConfig>> = {
  // Hosted entirely by Microsoft (Stargate / Azure) and Oracle.
  // OpenAI doesn't own physical chips — pure cloud tenant.
  OpenAI: { selfOwned: [], overridePct: 0 },

  // Google IS the lab parent. Alphabet listed defensively in case
  // Epoch starts splitting Alphabet/Google rows in a future release.
  Gemini: { selfOwned: ['Google', 'Alphabet'] },

  // Meta operates its own facilities and owns its Nvidia chips.
  Meta: { selfOwned: ['Meta'] },

  // xAI built and operates Colossus 1 + 2 directly.
  xAI: { selfOwned: ['xAI'] },

  // Anthropic is in transition — funding Trainium2 purchases via AWS
  // partnership and starting to take direct ownership of capacity, but
  // doesn't yet appear as a standalone owner row in Epoch's ZIP. The
  // 25% override reflects an estimate of currently-funded Trainium
  // capacity. Update as Epoch's data catches up.
  Anthropic: { selfOwned: [], overridePct: 25 },
};

/** Tooltip text shared between the column header and the inline label. */
export const PCT_OWNED_TOOLTIP =
  '% of this lab\'s effective fleet that is hardware they actually own ' +
  '(Epoch AI Chip Owners live data). 100% = full control. ' +
  'Low % = cloud-dependent. OpenAI / Anthropic use overrides only where ' +
  "Epoch attribution doesn't cleanly map to the lab.";

/** Footnote text for tables that surface the % Owned column. */
export const PCT_OWNED_FOOTNOTE =
  "Anthropic override reflects current Trainium purchases and owned sites " +
  "(in transition). All other values are directly derived from the live " +
  "Epoch AI Chip Owners ZIP.";
