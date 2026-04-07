import type { CSSProperties } from 'react';
import { useCallback, useMemo } from 'react';

import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100 } from '@/services/format';
import { LAB_TO_OWNER } from '@/services/ownershipMath';
import { useDashboard } from '@/store';
import type { Lab, OwnerSnapshot } from '@/types';

import styles from './OwnershipSidePanel.module.css';

/* ─────────────────────────────────────────────────────────────
   Operator Cross-Check strip — full-width, lab-anchored.

   ─── EDITORIAL FRAMING ───

   Epoch's dataset reports OPERATORS, not labs. It tells us
   "Microsoft bought 3.4M H100e worth of chips" — it does NOT
   tell us how many are running OpenAI workloads vs. Bing,
   Copilot, Azure customers, etc.

   Only Meta and xAI are operator = consumer. The other three
   are anchor tenants on hyperscaler infrastructure where the
   lab's exact slice is unknown.

   This strip matches Epoch 1:1 on the operator label and uses
   a SELF-OPERATED / SHARED HOST pill to surface the structural
   difference. No invented self-owned percentages.

   Designed as a horizontal full-width data strip (not a sidebar)
   so it slots between the Race chart row and ProjectionPanel.
   ───────────────────────────────────────────────────────────── */

interface LabAnchorInfo {
  /** Role descriptor used in the card sub-label. */
  role: string;
  integration: 'self' | 'shared';
}

const LAB_ANCHOR_INFO: Readonly<Record<Lab, LabAnchorInfo>> = {
  Gemini: { role: 'anchor tenant', integration: 'shared' },
  OpenAI: { role: 'primary tenant', integration: 'shared' },
  Anthropic: { role: 'anchor AI tenant', integration: 'shared' },
  Meta: { role: 'self-operated', integration: 'self' },
  xAI: { role: 'self-operated', integration: 'self' },
};

interface OperatorCard {
  lab: Lab;
  /** Primary label: matches Epoch's owner name 1:1. */
  ownerName: string;
  role: string;
  integration: 'self' | 'shared';
  h100e: number;
  /** Share of the 5-card subtotal. */
  pctOfFrontier: number;
  color: string;
}

interface DerivedStrip {
  cards: OperatorCard[];
  selfOperatedCount: number;
  asOf: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function OwnershipSidePanel(): JSX.Element | null {
  const { data, loading, error, lastUpdated, fromCache } = useEpochChipOwners();

  const setScope = useDashboard((s) => s.setScope);
  const setRaceMode = useDashboard((s) => s.setRaceMode);
  const setHighlightedOwner = useDashboard((s) => s.setHighlightedOwner);

  /**
   * Click handler: switch the Race section into Hardware Ownership view
   * (scope=fleet + raceMode=ownership), set the highlighted owner so the
   * OwnershipTable scrolls + flashes the matching row, and scroll the
   * Race section into view.
   *
   * The hash router (`useHashState`) will pick up the scope/mode change
   * and persist it in the URL automatically.
   */
  const jumpToOwnershipRow = useCallback(
    (ownerName: string): void => {
      setScope('fleet');
      setRaceMode('ownership');
      // Clear first so re-clicking the same card re-fires the highlight
      // effect in OwnershipTable (it watches for value changes).
      setHighlightedOwner(null);
      // Defer one tick so the OwnershipTable mounts before we set the
      // owner — otherwise the effect runs against an unmounted table.
      requestAnimationFrame(() => {
        setHighlightedOwner(ownerName);
        const el = document.getElementById('race');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [setScope, setRaceMode, setHighlightedOwner],
  );

  const derived = useMemo<DerivedStrip | null>(() => {
    if (!data) return null;

    const snapshotByOwner = new Map<string, OwnerSnapshot>();
    for (const s of data.latestByOwner) snapshotByOwner.set(s.owner, s);

    const cards: OperatorCard[] = LAB_NAMES.map((lab) => {
      const ownerName = LAB_TO_OWNER[lab];
      const snap = snapshotByOwner.get(ownerName);
      const info = LAB_ANCHOR_INFO[lab];
      return {
        lab,
        ownerName,
        role: info.role,
        integration: info.integration,
        h100e: snap?.h100e ?? 0,
        pctOfFrontier: 0,
        color: LAB_COLORS[lab],
      };
    })
      .filter((c) => c.h100e > 0)
      .sort((a, b) => b.h100e - a.h100e);

    const total = cards.reduce((s, c) => s + c.h100e, 0) || 1;
    for (const c of cards) c.pctOfFrontier = (c.h100e / total) * 100;

    const selfOperatedCount = cards.filter(
      (c) => c.integration === 'self',
    ).length;

    return { cards, selfOperatedCount, asOf: data.asOf };
  }, [data]);

  // ── Loading / error states ──
  if (!data && loading) {
    return (
      <aside className={styles.strip}>
        <div className={styles.skeleton}>Loading Epoch chip owners…</div>
      </aside>
    );
  }
  if (!data && error) {
    return (
      <aside className={styles.strip}>
        <div className={styles.errorMsg}>
          Couldn't load ownership data: {error}
        </div>
      </aside>
    );
  }
  if (!data || !derived) return null;

  const statusLabel = error
    ? 'STALE / OFFLINE'
    : fromCache
      ? 'CACHED'
      : 'LIVE';
  const statusCls = error
    ? styles.statusError
    : fromCache
      ? styles.statusStale
      : styles.statusLive;

  const topMax = derived.cards[0]?.h100e ?? 1;
  const total = derived.cards.length;

  return (
    <aside className={styles.strip}>
      {/* ─── Header bar ─── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.headerTitle}>
            WHO OWNS THE AI CHIPS?
          </h3>
          <p className={styles.headerSubtitle}>
            5 hyperscalers buy the chips — but only{' '}
            <strong>{derived.selfOperatedCount} of {total} frontier labs</strong>{' '}
            actually operate them. The other{' '}
            {total - derived.selfOperatedCount} are tenants on shared
            infrastructure.
          </p>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.statusDot} ${statusCls}`} />
          <span className={`${styles.statusPill} ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ─── 5 operator cards ─── */}
      <div className={styles.cardGrid}>
        {derived.cards.map((c) => {
          const w = Math.max(3, (c.h100e / topMax) * 100);
          const isSelf = c.integration === 'self';
          const pillCls = isSelf ? styles.pillSelf : styles.pillShared;
          const pillLabel = isSelf ? 'SELF-OPERATED' : 'SHARED HOST';
          return (
            <button
              key={c.lab}
              type="button"
              className={styles.card}
              onClick={() => jumpToOwnershipRow(c.ownerName)}
              title={`Open the Hardware Ownership table and jump to ${c.ownerName}`}
              aria-label={`View ${c.ownerName} in the Hardware Ownership table`}
              style={
                {
                  // Per-card accent color exposed as a CSS custom property
                  // so the stylesheet can use it for the top accent line,
                  // background gradient, name color, bar fill, and focus
                  // ring without inline-styling each element separately.
                  '--card-color': c.color,
                } as CSSProperties
              }
            >
              <div className={styles.cardBody}>
                <div className={styles.cardOperator}>{c.ownerName}</div>
                <div className={styles.cardValue}>{formatH100(c.h100e)}</div>
                <div className={styles.cardBarTrack}>
                  <div
                    className={styles.cardBarFill}
                    style={{ width: `${w}%` }}
                  />
                </div>
                <div className={styles.cardAnchor}>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.anchorLab}>
                    {isSelf ? 'self' : c.lab}
                  </span>
                  <span className={styles.role}>({c.role})</span>
                </div>
                <span className={`${styles.integrationPill} ${pillCls}`}>
                  {pillLabel}
                </span>
                <span className={styles.cardJumpHint}>
                  View in table →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Methodology footer ─── */}
      <div className={styles.summary}>
        <span className={styles.summaryNote}>
          Epoch reports <em>who bought the chips</em>, not who runs which
          workload — Microsoft's 3.4M includes Bing/Copilot/Azure customers,
          not just OpenAI. Only Meta + xAI are operator = consumer.
        </span>
        <span className={styles.summarySep}>·</span>
        <a
          className={styles.summaryLink}
          href="https://epoch.ai/data/ai_chip_owners.zip"
          target="_blank"
          rel="noreferrer"
        >
          ai_chip_owners.zip
        </a>
        <span className={styles.summarySep}>·</span>
        <span className={styles.summaryDate}>
          {formatDate(derived.asOf)}
          {lastUpdated && (
            <>
              {' '}
              <span className={styles.summaryMuted}>
                (pulled{' '}
                {new Date(lastUpdated).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                )
              </span>
            </>
          )}
        </span>
      </div>
    </aside>
  );
}
