import type { Chart as ChartJS } from 'chart.js';
import { useRef } from 'react';

import { ExportMenu } from '@/components/ui/ExportMenu';
import { SectionShell } from '@/components/ui/SectionShell';

import { BenchmarkTable } from './BenchmarkTable';
import FirstPrinciples from './FirstPrinciples';
import { MetrChart } from './MetrChart';
import styles from './ModelsSection.module.css';
import { TrainingComputeChart } from './TrainingComputeChart';
import { useModelsExport } from './useModelsExport';
import { WithinLabScaling } from './WithinLabScaling';

function ModelsSectionInner(): JSX.Element {
  const computeRef = useRef<ChartJS<'scatter'> | null>(null);
  const metrRef = useRef<ChartJS<'scatter'> | null>(null);
  const { exportBenchmarksCSV, exportComputePNG, exportMetrPNG } = useModelsExport(
    computeRef,
    metrRef,
  );

  return (
    <>
      <div className={styles.takeaways}>
        <h3 className={styles.takeawaysTitle}>KEY TAKEAWAYS — APRIL 2026</h3>
        <ul className={styles.takeawaysList}>
          <li>
            <strong>No single model dominates.</strong> Among public models,
            GPT-5.4 and Claude Opus 4.6 each lead 4 benchmarks, Gemini 3.1
            Pro leads 2.
          </li>
          <li>
            <strong>More compute still produces better frontier models.</strong>{' '}
            Training compute has grown ~5× per year since 2020 — and scaling laws
            (Kaplan 2020, Chinchilla 2022) keep delivering inside every lab's
            lineage.
          </li>
          <li>
            The charts below show the proof: exponential compute growth + clear
            within-family performance jumps.
          </li>
          <li>
            Efficiency, data quality, and iteration speed create real gaps —
            that's why the race is so intense.
          </li>
        </ul>
      </div>

      {/* ═══ Training compute growth ═══ */}
      <div>
        <div className={styles.subheading}>FRONTIER TRAINING COMPUTE HAS GROWN ~5× PER YEAR (2020–2026)</div>
        <div className={styles.subsubheading}>
          MORE COMPUTE = BETTER MODELS · LABS SCALE BECAUSE SCALING LAWS WORK
        </div>

        <div className={styles.controls}>
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
                key: 'compute',
                label: 'COMPUTE CHART PNG',
                icon: '📸',
                onClick: () => void exportComputePNG(),
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

        <TrainingComputeChart ref={computeRef} />

        <div className={styles.fn}>
          X-axis: model release date · Y-axis: estimated training FLOPs (log
          scale) · Dashed line: ~5× per year exponential trend · ● = published
          training compute · ▲ = analyst estimate.{' '}
          <strong>
            DATA:{' '}
            <a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noreferrer">
              Epoch AI Notable Models
            </a>
          </strong>
          {' '}+ provider system cards + SemiAnalysis estimates. Training FLOPs
          for 2024–2026 models are largely estimated — labs no longer publish
          exact figures.
        </div>
      </div>

      {/* ═══ Within-lab scaling ═══ */}
      <WithinLabScaling />

      {/* ═══ First Principles explainer ═══ */}
      <FirstPrinciples />

      {/* ═══ Transition to benchmarks ═══ */}
      <div className={styles.transition}>
        <strong>The charts above show why labs are in a compute arms race.</strong>{' '}
        Now let's see how the current frontier actually performs head-to-head.
      </div>

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
