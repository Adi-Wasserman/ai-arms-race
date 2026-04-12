import { useEffect, useState } from 'react';

import { LAB_COLORS } from '@/config/labs';

import styles from './KnownLeasesCard.module.css';

/* ─────────────────────────────────────────────────────────────
   "Known Major Leases" — collapsible editorial card.

   Mounted in RaceSection directly after the OwnershipTable when
   raceMode === 'ownership'. Surfaces the public-knowledge cloud
   → lab relationships that are NOT directly readable from the
   Epoch ZIP (which reports operator totals, not the operator-to-
   tenant allocation breakdown).

   The bullets are deliberately editorial, not derived from any
   live data source — they exist to explain WHY the OwnershipTable
   shows e.g. Microsoft as 3.3M H100e while OpenAI shows 0% owned.
   The disclaimer at the bottom is the central methodological
   honesty statement.

   Collapsed/expanded preference persists across sessions via
   localStorage. Read synchronously on first render so the card
   does not flash open-then-collapsed when the user has previously
   collapsed it.
   ───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'knownLeasesCardCollapsed_v1';

interface LeaseBullet {
  /** The hyperscaler / operator on the left of the arrow. */
  operator: string;
  /** The frontier lab on the right (or "self" when operator = lab). */
  lab: string;
  /** Lab brand color used for the lab name accent. */
  labColor: string;
  /** One-sentence editorial detail. */
  detail: string;
}

const BULLETS: readonly LeaseBullet[] = [
  {
    operator: 'Microsoft Azure + Stargate',
    lab: 'OpenAI',
    labColor: '#9a9a9a', // OpenAI gray override (per CLAUDE.md editorial)
    detail:
      "Primary compute partner. The bulk of OpenAI's training capacity " +
      'sits inside Microsoft-operated facilities, with Oracle-hosted ' +
      'overflow on the Stargate buildout.',
  },
  {
    operator: 'Google (owns TPUs, used internally)',
    lab: 'Gemini',
    labColor: LAB_COLORS.Gemini,
    detail:
      'Google designs the TPUs and uses them internally to train Gemini. ' +
      "Self-operated — no intermediary. 100% owned.",
  },
  {
    operator: 'AWS Trainium + EC2',
    lab: 'Anthropic',
    labColor: LAB_COLORS.Anthropic,
    detail:
      'Anthropic is the anchor tenant on AWS\'s frontier-AI capacity ' +
      "via the multi-billion-dollar partnership. Anthropic also funds " +
      "Trainium2 procurement directly through the AWS deal.",
  },
  {
    operator: 'Microsoft Azure + NVIDIA',
    lab: 'Anthropic',
    labColor: LAB_COLORS.Anthropic,
    detail:
      '$30B commitment with GB200 (Grace Blackwell + Vera Rubin) capacity, ' +
      'up to 1 GW. GB200 ≈ 2.5 H100e.',
  },
  {
    operator: 'Google (TPUs rented via Google Cloud + Broadcom)',
    lab: 'Anthropic',
    labColor: LAB_COLORS.Anthropic,
    detail:
      'Same Google-designed TPUs, but Anthropic rents capacity via a ' +
      'commercial cloud partnership. Multi-GW deal announced Apr 2026 ' +
      'for 2027+ delivery. Not owned.',
  },
];

const DISCLAIMER =
  "Exact fractional allocation of each hyperscaler's chips to each lab " +
  'is proprietary and not published by Epoch.';

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(v: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (v) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage unavailable — silent no-op */
  }
}

export function KnownLeasesCard(): JSX.Element {
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed());

  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  const open = !collapsed;
  return (
    <section
      className={styles.card}
      aria-labelledby="known-leases-title"
    >
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        aria-controls="known-leases-body"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <h3 id="known-leases-title" className={styles.title}>
          Who Trains on Whose Chips
        </h3>
        <span className={styles.subtitle}>
          cloud → lab relationships behind the numbers
        </span>
      </button>

      {open && (
        <div id="known-leases-body" className={styles.body}>
          <ul className={styles.bullets}>
            {BULLETS.map((b, i) => (
              <li key={i} className={styles.bullet}>
                <div className={styles.bulletHead}>
                  <span className={styles.operator}>{b.operator}</span>
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                  <span className={styles.lab} style={{ color: b.labColor }}>
                    {b.lab}
                  </span>
                </div>
                <div className={styles.detail}>{b.detail}</div>
              </li>
            ))}
          </ul>

          <p className={styles.disclaimer}>
            <span className={styles.disclaimerMark} aria-hidden="true">
              !
            </span>
            {DISCLAIMER}
          </p>
        </div>
      )}
    </section>
  );
}
