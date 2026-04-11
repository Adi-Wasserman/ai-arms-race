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
      <div className={styles.intro}>
        No single model dominates. <strong>GPT-5.4, Gemini 3.1 Pro, and Claude
        Opus 4.6</strong> trade the lead across different benchmark categories —
        reasoning, coding, science, and multimodal. The frontier is a three-way
        contest, not a one-horse race.
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
