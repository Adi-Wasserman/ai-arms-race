import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { LAB_OWNERSHIP_CONFIG } from '@/config/labOwnershipMapping';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';

import styles from './TruthModal.module.css';

/* ─────────────────────────────────────────────────────────────
   Truth & Data Limitations modal.

   Surfaces every methodological caveat that the dashboard's
   editorial UX deliberately under-emphasizes elsewhere — sources
   with direct download links, the full LAB_OWNERSHIP_CONFIG table
   so users can verify exactly which numbers use overrides,
   uncertainty bands carried over from Epoch's documentation, and
   a one-line summary that anchors the whole thing.

   Mounted at the document root via Portal so the backdrop covers
   the fixed nav bar. Closes on Escape, backdrop click, or × button.
   No focus trap (single button + scrollable content — keyboard
   users can tab out without surprises) but the close button is
   auto-focused on open for keyboard recovery.
   ───────────────────────────────────────────────────────────── */

interface TruthModalProps {
  open: boolean;
  onClose: () => void;
}

const EPOCH_FACILITIES_URL = 'https://epoch.ai/data/data-centers';
const EPOCH_FACILITIES_CSV =
  'https://epoch.ai/data/ai_data_centers.csv';
const EPOCH_CHIPOWNERS_URL =
  'https://epoch.ai/blog/introducing-the-ai-chip-owners-explorer';
const EPOCH_CHIPOWNERS_ZIP = 'https://epoch.ai/data/ai_chip_owners.zip';

interface UncertaintyNote {
  metric: string;
  band: string;
  source: string;
}

const UNCERTAINTY_NOTES: readonly UncertaintyNote[] = [
  {
    metric: 'Facility online dates',
    band: '± 6 months',
    source:
      "Epoch's satellite-verified construction signals (cooling towers, " +
      'roof completion, substation status) infer schedules from imagery, ' +
      'not insider commit dates.',
  },
  {
    metric: 'H100e capacity per facility',
    band: '× 0.7 / × 1.4',
    source:
      "Epoch's Monte Carlo 5th–95th percentile range, propagated from " +
      'unit-count uncertainty + chip-mix assumptions per site.',
  },
  {
    metric: 'Cloud-lease fleet (Anthropic + Gemini)',
    band: 'analyst estimate',
    source:
      'Sourced from announced multi-cloud agreements (AWS Trainium, ' +
      'Google + Broadcom multi-GW TPU deal, Azure Stargate). Not satellite-' +
      'verifiable — treat as a rough envelope, not a precise number.',
  },
  {
    metric: '2029 projections',
    band: '± 8% base + 6%/yr',
    source:
      'Power-constrained per-lab targets from Epoch satellite ramps + ' +
      'sourced cloud-lease fleet, ease-out interpolation. Compounds to ' +
      '±24% by Jan 2029 → range 29M–47M H100e total.',
  },
  {
    metric: 'Owner → Lab attribution',
    band: 'over-attributed',
    source:
      "Epoch's `Microsoft` operator total includes Bing/Office/Azure " +
      "customer workloads, not just OpenAI. Same for `Amazon` (general AWS, " +
      "not just Anthropic). The dashboard's % Owned column uses the override " +
      'path for these two labs to avoid silent over-attribution.',
  },
  {
    metric: 'METR Time Horizons',
    band: 'mixed-source',
    source:
      'Some data points come from secondary write-ups (LessWrong, OfficeChai) ' +
      'rather than the primary METR YAML. Newer measurements (post-2025-Q3) ' +
      'should be treated as preliminary until back-validated.',
  },
];

export function TruthModal({ open, onClose }: TruthModalProps): JSX.Element | null {
  // Escape-key dismissal + body-scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="truth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>About this dashboard</div>
            <h2 id="truth-modal-title" className={styles.title}>
              Truth &amp; Data Limitations
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
            autoFocus
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {/* ─── Summary ─── */}
          <p className={styles.summary}>
            This is the <strong>most accurate public picture possible</strong>{' '}
            of the AI compute race. The only non-derived numbers are the two
            documented overrides for <strong>OpenAI</strong> and{' '}
            <strong>Anthropic</strong> — every other value flows directly from
            Epoch AI&apos;s live datasets.
          </p>

          {/* ─── Sources ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>1 · Sources</h3>
            <ul className={styles.sourceList}>
              <li>
                <div className={styles.sourceLabel}>
                  Epoch AI · Frontier Data Centers
                </div>
                <div className={styles.sourceLinks}>
                  <a
                    href={EPOCH_FACILITIES_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer →
                  </a>
                  <a
                    href={EPOCH_FACILITIES_CSV}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sourceCsv}
                  >
                    ai_data_centers.csv ↓
                  </a>
                </div>
                <div className={styles.sourceMeta}>
                  Satellite-verified construction signals + facility metadata.
                  CC BY 4.0. Pulled live on every page load with a CORS-proxy
                  fallback for offline-cached display.
                </div>
              </li>
              <li>
                <div className={styles.sourceLabel}>
                  Epoch AI · Chip Owners Explorer
                </div>
                <div className={styles.sourceLinks}>
                  <a
                    href={EPOCH_CHIPOWNERS_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer →
                  </a>
                  <a
                    href={EPOCH_CHIPOWNERS_ZIP}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sourceCsv}
                  >
                    ai_chip_owners.zip ↓
                  </a>
                </div>
                <div className={styles.sourceMeta}>
                  Three CSVs in one ZIP: cumulative_by_designer,
                  cumulative_by_chip_type, quarters_by_chip_type. Sourced
                  H100e medians + Monte Carlo 5th/95th percentiles. CC BY 4.0,
                  cached locally for 24h after first fetch.
                </div>
              </li>
            </ul>
          </section>

          {/* ─── Why cloud providers appear as owners + LAB_OWNERSHIP_CONFIG table ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              2 · Why we show cloud providers as the owners
            </h3>
            <p className={styles.methodologyText}>
              Epoch&apos;s Chip Owners dataset attributes every chip to{' '}
              <strong>whoever bought it</strong>, not whoever trains on it.
              That means Microsoft&apos;s 3M+ H100e includes capacity sold to
              OpenAI, Bing, Copilot, and every Azure customer — Epoch does
              not publish the per-tenant breakdown. The dashboard mirrors
              this 1:1 in the operator-row table, then layers a documented
              override path on top for the two frontier labs that own none
              of their own silicon (OpenAI, Anthropic). The full surface
              area of those overrides is below — every other lab&apos;s
              percentage is 100% derived from the live ZIP.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lab</th>
                    <th>Self-owned (Epoch operator names)</th>
                    <th className={styles.right}>Override %</th>
                    <th>Resolution path</th>
                  </tr>
                </thead>
                <tbody>
                  {LAB_NAMES.map((lab) => {
                    const cfg = LAB_OWNERSHIP_CONFIG[lab];
                    const usesOverride = cfg.selfOwned.length === 0;
                    const labColor = LAB_COLORS[lab];
                    return (
                      <tr
                        key={lab}
                        className={
                          usesOverride ? styles.rowOverride : undefined
                        }
                      >
                        <td>
                          <span
                            className={styles.labName}
                            style={{ color: labColor }}
                          >
                            {lab}
                          </span>
                        </td>
                        <td>
                          {cfg.selfOwned.length > 0 ? (
                            <code className={styles.code}>
                              {cfg.selfOwned.join(', ')}
                            </code>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td className={styles.right}>
                          {cfg.overridePct !== undefined ? (
                            <span className={styles.overrideBadge}>
                              {cfg.overridePct}%
                            </span>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td className={styles.resolution}>
                          {cfg.selfOwned.length > 0
                            ? 'Sum of selfOwned medians from live Epoch ZIP ÷ effective fleet'
                            : cfg.overridePct === 0
                              ? 'Pure cloud tenant — no first-party chip ownership'
                              : 'Manual override (transition case — see footnote)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={styles.tableNote}>
              <strong>Read order in</strong>{' '}
              <code className={styles.code}>computePctOwned()</code>:{' '}
              selfOwned has entries → derived from Epoch · selfOwned empty +
              overridePct set → use override · selfOwned empty + no override
              → 0%.
            </p>
          </section>

          {/* ─── Uncertainty notes ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>3 · Uncertainty</h3>
            <ul className={styles.uncertaintyList}>
              {UNCERTAINTY_NOTES.map((u) => (
                <li key={u.metric}>
                  <div className={styles.uncMetric}>
                    <span className={styles.uncLabel}>{u.metric}</span>
                    <span className={styles.uncBand}>{u.band}</span>
                  </div>
                  <div className={styles.uncSource}>{u.source}</div>
                </li>
              ))}
            </ul>
          </section>

          {/* ─── Closing summary ─── */}
          <p className={styles.closing}>
            If you spot a number that looks wrong,{' '}
            <a
              href="https://github.com/Adi-Wasserman/ai-arms-race/issues"
              target="_blank"
              rel="noreferrer"
            >
              open an issue on GitHub
            </a>
            . Every value in this dashboard is traceable to one of the two
            Epoch CSVs above or to a clearly-documented override row in the
            table.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
