import { useMemo } from 'react';

import { HoverTip, TipHeader, TipRow } from '@/components/ui/HoverTip';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { PROJ_END } from '@/config/projections';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { localTodayIso } from '@/services/dates';
import { formatH100 } from '@/services/format';
import { computeTargetPace, type PaceResult } from '@/services/paceTracker';
import { useDashboard } from '@/store';

import styles from './TargetTracker.module.css';

const TODAY_ISO = localTodayIso();

const STATUS_CLASS: Record<PaceResult['status'], string> = {
  MET: 'statusMet',
  AHEAD: 'statusAhead',
  'ON PACE': 'statusOnPace',
  BEHIND: 'statusBehind',
  'FAR BEHIND': 'statusFarBehind',
  'NO DATA': 'statusNoData',
};

/**
 * Labs whose observed basis structurally omits known capacity, making a
 * pace verdict unfair. OpenAI's Azure fleet is invisible to this basis
 * (satellite tracks Stargate only; there are no OpenAI cloud-lease legs)
 * while its 15M target INCLUDES the Azure fleet — so both "now" and the
 * trailing pace are undercounted. We show the math but withhold the
 * verdict rather than render a misleading red badge.
 */
const BASIS_GAP_NOTES: Partial<Record<PaceResult['lab'], string>> = {
  OpenAI:
    "Status withheld: OpenAI's Azure fleet is invisible to this basis — satellite tracking covers Stargate only, and we model no OpenAI cloud-lease legs — while the 15M target includes Azure. Both the observed level and the trailing pace are undercounted, so a pace verdict would be unfairly negative.",
};

/** Structured arithmetic shown on hover so the verdict is auditable. */
function PaceTip({ r }: { r: PaceResult }): JSX.Element {
  if (r.status === 'MET') {
    return (
      <>
        <TipHeader>
          {r.lab} — TARGET MET
        </TipHeader>
        <TipRow label="Observed" value={formatH100(r.observedNow)} />
        <TipRow
          label="Target"
          value={formatH100(r.targetH)}
          sub="already exceeded"
        />
      </>
    );
  }
  const pct = r.paceRatio != null ? Math.round(r.paceRatio * 100) : 0;
  const quartersLeft =
    r.requiredPerQuarter > 0
      ? ((r.targetH - r.observedNow) / r.requiredPerQuarter).toFixed(1)
      : '—';
  return (
    <>
      <TipHeader>
        {r.lab} — {r.status}
      </TipHeader>
      <TipRow label="Observed now" value={formatH100(r.observedNow)} />
      <TipRow label="Target" value={`${formatH100(r.targetH)} · Jan 2029`} />
      <TipRow
        label="Required"
        value={`+${formatH100(r.requiredPerQuarter)}/qtr`}
        sub={`(target − now) ÷ ${quartersLeft} quarters left`}
      />
      <TipRow
        label="Trailing"
        value={`${r.trailingPerQuarter >= 0 ? '+' : ''}${formatH100(r.trailingPerQuarter)}/qtr`}
        sub={`observed growth, last ~${r.trailingWindowDays} days`}
      />
      <TipRow
        label="Pace"
        value={`${pct}% of required`}
        sub="AHEAD ≥115% · ON PACE ≥85% · BEHIND ≥50%"
      />
    </>
  );
}

/**
 * 2029 target accountability — converts the announced targets from a
 * passive table into falsifiable claims that resolve with every Epoch
 * release: is each lab's OBSERVED buildout on the pace its target
 * requires?
 */
export function TargetTracker(): JSX.Element | null {
  const seriesFull = useDashboard((s) => s.seriesFull);
  const dataVersion = useDashboard((s) => s.dataVersion);

  const results = useMemo<PaceResult[]>(
    () =>
      LAB_NAMES.map((lab) =>
        computeTargetPace(
          seriesFull,
          lab,
          PROJ_2029_TARGETS[lab].h,
          TODAY_ISO,
          PROJ_END,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataVersion],
  );

  if (results.every((r) => r.status === 'NO DATA')) return null;

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.title}>2029 Target Accountability</h3>
        <span className={styles.subtitle}>
          Are the announced buildouts on pace? Resolves with every Epoch
          release.
        </span>
      </header>

      <div className={styles.grid}>
        {results.map((r) => {
          const color = LAB_COLORS[r.lab];
          const basisGap = BASIS_GAP_NOTES[r.lab];
          const ratioPct =
            r.paceRatio != null
              ? Math.max(0, Math.min(150, r.paceRatio * 100))
              : r.status === 'MET'
                ? 150
                : 0;
          return (
            <div key={r.lab} className={styles.labCard}>
              <div className={styles.labHead}>
                <span className={styles.labName} style={{ color }}>
                  {r.lab}
                </span>
                {basisGap ? (
                  <HoverTip
                    wide
                    content={
                      <>
                        <TipHeader>{r.lab} — verdict withheld</TipHeader>
                        <div>{basisGap}</div>
                      </>
                    }
                  >
                    <span
                      className={`${styles.statusPill} ${styles.statusBasisGap}`}
                      tabIndex={0}
                    >
                      BASIS GAP ⓘ
                    </span>
                  </HoverTip>
                ) : (
                  <HoverTip wide content={<PaceTip r={r} />}>
                    <span
                      className={`${styles.statusPill} ${styles[STATUS_CLASS[r.status]]}`}
                      tabIndex={0}
                    >
                      {r.status}
                    </span>
                  </HoverTip>
                )}
              </div>

              {r.status === 'NO DATA' ? (
                <div className={styles.noData}>No series data.</div>
              ) : (
                <>
                  <div className={styles.progressLine}>
                    <span className={styles.now}>
                      {formatH100(r.observedNow)}
                    </span>
                    <span className={styles.arrow}> → </span>
                    <span className={styles.target}>
                      {formatH100(r.targetH)}
                    </span>
                    <span className={styles.targetLabel}> by Jan 2029</span>
                  </div>

                  {r.status !== 'MET' && (
                    <>
                      <div className={styles.paceLine}>
                        needs{' '}
                        <strong>+{formatH100(r.requiredPerQuarter)}/qtr</strong>
                        {' · '}trailing{' '}
                        <strong
                          className={
                            basisGap
                              ? undefined
                              : r.trailingPerQuarter >= r.requiredPerQuarter
                                ? styles.paceGood
                                : styles.paceBad
                          }
                        >
                          {r.trailingPerQuarter >= 0 ? '+' : ''}
                          {formatH100(r.trailingPerQuarter)}/qtr
                        </strong>
                        {basisGap && (
                          <span className={styles.basisGapNote}>
                            {' '}
                            (undercounted — see ⓘ)
                          </span>
                        )}
                      </div>
                      <div className={styles.ratioTrack}>
                        <div
                          className={styles.ratioFill}
                          style={{
                            width: `${(ratioPct / 150) * 100}%`,
                            background: color,
                            opacity: basisGap ? 0.3 : undefined,
                          }}
                        />
                        <div className={styles.ratioMark} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className={styles.footnote}>
        Method: required pace = (target − observed today) ÷ quarters
        remaining to Jan 2029. Trailing pace = observed growth over the
        last ~180 days, per quarter. Status = trailing ÷ required: AHEAD
        ≥115% · ON PACE ≥85% · BEHIND ≥50% · FAR BEHIND &lt;50%. Hover any
        pill for the exact arithmetic. Basis = TOTAL CAPACITY (satellite +
        estimate legs, the same basis as the targets). OpenAI's verdict is
        withheld — its Azure fleet is invisible to this basis. Resolves
        with every Epoch release; early-period trailing pace leans on
        sourced ramp schedules until the snapshot archive accumulates
        more purely-observed history.
      </p>
    </section>
  );
}
