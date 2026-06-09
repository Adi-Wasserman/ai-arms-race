import { useCollapsible } from '@/hooks/useCollapsible';

import styles from './ChipConversionCard.module.css';

/**
 * Spec-derived chip → H100e conversion reference.
 *
 * These ratios are fixed by published hardware specifications — they are
 * NOT editorial knobs. The genuinely uncertain inputs on this dashboard
 * are fleet SIZES and chip MIXES (flagged with EST badges); the per-chip
 * equivalency itself follows from the silicon.
 */
interface ConversionRow {
  chip: string;
  vendor: string;
  ratio: string;
  basis: string;
}

const CONVERSIONS: readonly ConversionRow[] = [
  {
    chip: 'H100 (SXM)',
    vendor: 'NVIDIA',
    ratio: '1.00',
    basis: 'Reference unit — 989 BF16 TFLOPS.',
  },
  {
    chip: 'H200',
    vendor: 'NVIDIA',
    ratio: '1.00',
    basis:
      'Same compute die as H100 (989 BF16 TFLOPS); more/faster HBM helps serving, not training FLOPs.',
  },
  {
    chip: 'GB200 (per GPU)',
    vendor: 'NVIDIA',
    ratio: '≈2.5',
    basis:
      'Blackwell ~2.2–2.5× H100 dense training throughput; sustained-training basis, not peak marketing.',
  },
  {
    chip: 'Vera Rubin',
    vendor: 'NVIDIA',
    ratio: '≈3 (provisional)',
    basis: '2027+. Public specs pending — conversion will be updated.',
  },
  {
    chip: 'Trainium2',
    vendor: 'AWS',
    ratio: '0.93',
    basis: '918 vs 989 BF16 TFLOPS — direct spec ratio.',
  },
  {
    chip: 'TPU v6e (Trillium)',
    vendor: 'Google',
    ratio: '≈0.93',
    basis: '~918 BF16 TFLOPS per chip — spec ratio vs H100.',
  },
  {
    chip: 'TPU v7 (Ironwood)',
    vendor: 'Google',
    ratio: '≈2.3',
    basis: 'Google-published peak throughput vs H100-class parts.',
  },
];

const BLENDS: readonly { leg: string; ratio: string; note: string }[] = [
  {
    leg: 'Anthropic GCP TPUs (EAI-GCP)',
    ratio: '~1.4 / chip',
    note: 'Mix-weighted v6e (0.93) ↔ Ironwood (2.3). The blend reflects the assumed mix — the per-chip ratios are fixed by spec.',
  },
  {
    leg: 'Gemini internal fleet (EGC)',
    ratio: '~1.2 / chip',
    note: 'Older v4/v5 fleet average. Uncertainty is in fleet size + mix, not the per-chip physics.',
  },
];

export function ChipConversionCard(): JSX.Element {
  const { open, toggle } = useCollapsible({ defaultOpen: false });

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.toggleBtn}
          aria-expanded={open}
          onClick={toggle}
        >
          <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
          <h3 className={styles.title}>
            Chip → H100e Conversions (Spec-Derived)
          </h3>
        </button>
      </header>

      {open && (
        <div className={styles.body}>
          <p className={styles.intro}>
            Every cross-chip comparison on this dashboard uses these
            conversion ratios. They follow from published hardware
            specifications — fixed by the silicon, not editorial judgment.
            The genuinely uncertain inputs are fleet <em>sizes</em> and
            chip <em>mixes</em>, which the EST badges flag above.
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>CHIP</th>
                <th className={styles.th}>VENDOR</th>
                <th className={`${styles.th} ${styles.right}`}>H100e</th>
                <th className={styles.th}>SPEC BASIS</th>
              </tr>
            </thead>
            <tbody>
              {CONVERSIONS.map((row) => (
                <tr key={row.chip} className={styles.row}>
                  <td className={`${styles.td} ${styles.chip}`}>{row.chip}</td>
                  <td className={styles.td}>{row.vendor}</td>
                  <td className={`${styles.td} ${styles.right} ${styles.ratio}`}>
                    {row.ratio}
                  </td>
                  <td className={`${styles.td} ${styles.basis}`}>{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.blends}>
            <div className={styles.blendsHead}>BLENDED LEGS</div>
            {BLENDS.map((b) => (
              <div key={b.leg} className={styles.blendRow}>
                <span className={styles.blendLeg}>{b.leg}</span>
                <span className={styles.blendRatio}>{b.ratio}</span>
                <span className={styles.blendNote}>{b.note}</span>
              </div>
            ))}
          </div>

          <p className={styles.footnote}>
            Training-throughput basis (BF16/FP8 dense), not peak marketing
            numbers. Ratios are updated when vendors publish new specs —
            Vera Rubin's is provisional until then.
          </p>
        </div>
      )}
    </section>
  );
}
