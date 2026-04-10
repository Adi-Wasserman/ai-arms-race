import type { Chart as ChartJS } from 'chart.js';
import { useRef } from 'react';

import { ExportMenu } from '@/components/ui/ExportMenu';
import { SectionShell } from '@/components/ui/SectionShell';
import { Toggle } from '@/components/ui/Toggle';
import { useDashboard } from '@/store';
import type { ScatterView } from '@/types';

import { BenchmarkTable } from './BenchmarkTable';
import FirstPrinciples from './FirstPrinciples';
import { MetrChart } from './MetrChart';
import styles from './ModelsSection.module.css';
import { ScatterPlot } from './ScatterPlot';
import { useModelsExport } from './useModelsExport';

const SCATTER_VIEW_OPTS = [
  { value: 'observed' as const, label: 'OBSERVED · APR 2026' },
  { value: 'projected' as const, label: 'PROJECTED · JAN 2029' },
];

function ModelsSectionInner(): JSX.Element {
  const scatterView = useDashboard((s) => s.scatterView);
  const setScatterView = useDashboard((s) => s.setScatterView);

  const scatterRef = useRef<ChartJS<'scatter'> | null>(null);
  const metrRef = useRef<ChartJS<'scatter'> | null>(null);
  const { exportBenchmarksCSV, exportScatterPNG, exportMetrPNG } = useModelsExport(
    scatterRef,
    metrRef,
  );

  return (
    <>
      <div className={styles.intro}>
        No single model dominates. <strong>GPT-5.4, Gemini 3.1 Pro, and Claude
        Opus 4.6</strong> trade the lead across different benchmark categories —
        reasoning, coding, science, and multimodal. The frontier is a three-way
        contest, not a one-horse race.
      </div>

      {/* ═══ Compute vs Performance scatter ═══ */}
      <div>
        <div className={styles.subheading}>COMPUTE vs PERFORMANCE</div>
        <div className={styles.subsubheading}>
          DOES MORE COMPUTE = BETTER AI? · H100e CAPACITY vs AA INTELLIGENCE INDEX
        </div>

        <div className={styles.controls}>
          <Toggle<ScatterView>
            value={scatterView}
            options={SCATTER_VIEW_OPTS}
            onChange={setScatterView}
            ariaLabel="Scatter view"
          />
          <span className={styles.spacer} />
          <ExportMenu
            items={[
              {
                key: 'benchmarks',
                label: 'BENCHMARKS CSV',
                icon: '📊',
                onClick: exportBenchmarksCSV,
              },
              {
                key: 'scatter',
                label: 'SCATTER PNG',
                icon: '📸',
                onClick: () => void exportScatterPNG(),
              },
              {
                key: 'metr',
                label: 'METR PNG',
                icon: '📸',
                onClick: () => void exportMetrPNG(),
              },
            ]}
          />
        </div>

        <ScatterPlot ref={scatterRef} />

        <div className={styles.fn}>
          X-axis: total H100-equivalent compute per lab · Y-axis: AA Intelligence
          Index v4.0 (composite of 10 evals) · Bubble size: power footprint (GW) ·
          Trend line: OLS linear regression · Labs with no AA Index score (Meta,
          xAI) plotted at estimated positions based on analyst consensus.{' '}
          <strong>Correlation ≠ causation</strong> — algorithmic efficiency, data
          quality, and architecture drive outcomes as much as compute.
        </div>
      </div>

      {/* ═══ First Principles explainer ═══ */}
      <FirstPrinciples />

      {/* ═══ Benchmark comparison table ═══ */}
      <BenchmarkTable />

      {/* ═══ METR Time Horizons ═══ */}
      <div className={styles.subsection}>
        <MetrChart ref={metrRef} />
        <div className={styles.fn}>
          DATA:{' '}
          <a href="https://metr.org/time-horizons/" target="_blank" rel="noreferrer">
            METR Time Horizons TH1.1
          </a>{' '}
          (updated Mar 3, 2026) · Doubling time ~4 months · Linear scale (hours)
        </div>
      </div>

      <div className={styles.fn}>
        DATA:{' '}
        <a
          href="https://artificialanalysis.ai/leaderboards/models"
          target="_blank"
          rel="noreferrer"
        >
          Artificial Analysis v4.0
        </a>{' '}
        (Intelligence Index, speed, pricing) ·{' '}
        <a href="https://gpqa-diamond.github.io" target="_blank" rel="noreferrer">
          GPQA Diamond
        </a>{' '}
        ·{' '}
        <a href="https://www.swebench.com" target="_blank" rel="noreferrer">
          SWE-bench Verified
        </a>{' '}
        ·{' '}
        <a href="https://arcprize.org" target="_blank" rel="noreferrer">
          ARC-AGI-2
        </a>{' '}
        ·{' '}
        <a href="https://last-exam.ai" target="_blank" rel="noreferrer">
          HLE
        </a>{' '}
        ·{' '}
        <a href="https://osworld.github.io" target="_blank" rel="noreferrer">
          OSWorld
        </a>{' '}
        + provider system cards. Scores are a snapshot — update per new model release.
      </div>
    </>
  );
}

export function ModelsSection(): JSX.Element {
  return (
    <SectionShell
      id="models"
      title="MODELS"
      subtitle="FRONTIER MODEL BENCHMARKS · WHICH LAB IS PRODUCING THE BEST AI"
    >
      <ModelsSectionInner />
    </SectionShell>
  );
}
