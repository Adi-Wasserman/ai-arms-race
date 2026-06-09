import { useCollapsible } from '@/hooks/useCollapsible';

import styles from './FirstPrinciples.module.css';

/* ─────────────────────────────────────────────────────────────
   "First Principles" — collapsible editorial card.

   Mounted between the scatter plot and BenchmarkTable in
   ModelsSection. Explains the 6 interlocking drivers of
   frontier model quality beyond raw compute.

   Follows the KnownLeasesCard pattern: single header toggle,
   conditional body render, localStorage-persisted preference.
   ───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'firstPrinciplesCollapsed_v1';

interface Principle {
  number: number;
  title: string;
  role: string;
  body: string;
  frontier?: string;
  /** Accent color for the left border + number badge. */
  accent: string;
}

const PRINCIPLES: readonly Principle[] = [
  {
    number: 1,
    title: 'Data is the Signal',
    role: 'the single most important ingredient',
    body: 'A model is just a giant compression engine. It can only ever know what is in its training data. More diverse, cleaner, higher-signal data = exponentially better world model.',
    frontier: 'Frontier edge: curated + synthetic data now beats raw volume.',
    accent: '#00ff87', // green — signal-positive
  },
  {
    number: 2,
    title: 'Compute is the Fuel',
    role: 'the optimizer',
    body: 'Performance scales predictably with total training FLOPs (Bitter Lesson + Chinchilla laws), and compute is the one input labs can directly buy. That dual role — predictive AND controllable — is why we track the fleet so closely.',
    accent: '#ffaa00', // amber — ties to compute/power theme
  },
  {
    number: 3,
    title: 'Parameters are Model Capacity',
    role: '',
    body: 'More parameters = ability to represent more complex functions. Modern Mixture-of-Experts (MoE) gives massive capacity without insane inference cost.',
    accent: '#4285f4', // blue
  },
  {
    number: 4,
    title: 'Pretraining + Post-Training is the Recipe',
    role: '',
    body: 'Pretraining learns the entire distribution of human knowledge. Post-training (RLHF/RLAIF + test-time compute like o1-style reasoning) turns the raw model into something helpful and agentic.',
    accent: '#b388ff', // purple
  },
  {
    number: 5,
    title: 'Iteration Speed & Infrastructure',
    role: 'the hidden accelerator',
    body: 'The team that can run more high-quality experiments per week wins. A 2–3× faster training loop beats a 10% bigger cluster.',
    accent: '#00d4ff', // cyan
  },
  {
    number: 6,
    title: 'Evaluation & Feedback Loops',
    role: 'the steering wheel',
    body: 'You only improve what you measure. Closed-loop iteration with real-world usage data beats open-loop scaling.',
    accent: '#ff4444', // red
  },
];

export default function FirstPrinciples(): JSX.Element {
  const { open, toggle } = useCollapsible({ storageKey: STORAGE_KEY });

  return (
    <section className={styles.card} aria-labelledby="first-principles-title">
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        aria-controls="first-principles-body"
        onClick={toggle}
      >
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <h3 id="first-principles-title" className={styles.title}>
          Compute is the biggest controllable lever…{' '}
          <span className={styles.titleEm}>but it's not the only one.</span>
        </h3>
        <span className={styles.subtitle}>
          6 first-principles drivers of frontier model quality
        </span>
      </button>

      {open && (
        <div id="first-principles-body" className={styles.body}>
          <p className={styles.lede}>
            The charts above show training FLOPs growing ~5× per year —
            and within each lab, more compute consistently yields better
            models. But compute alone doesn't explain who wins. Data
            quality, post-training sophistication, architecture, and
            iteration speed are the real differentiators. The best
            frontier models emerge from{' '}
            <strong>six interlocking truths</strong>:
          </p>

          <ol className={styles.principles}>
            {PRINCIPLES.map((p) => (
              <li
                key={p.number}
                className={styles.row}
                style={{ '--accent': p.accent } as React.CSSProperties}
              >
                <span className={styles.rowNumber}>{p.number}</span>
                <div className={styles.rowContent}>
                  <div className={styles.rowTitle}>
                    {p.title}
                    {p.role && (
                      <span className={styles.rowRole}>({p.role})</span>
                    )}
                  </div>
                  <div className={styles.rowBody}>
                    {p.body}
                    {p.frontier && (
                      <>
                        {' '}
                        <span className={styles.frontier}>{p.frontier}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.callout}>
            The best frontier model is the one that compresses the most useful
            knowledge from the highest-quality data, using the most compute,
            refined through the smartest RL loop, and iterated the fastest.
          </div>
        </div>
      )}
    </section>
  );
}
