import { useState } from 'react';

import { CONSTRUCTION_SIGNALS } from '@/config/signals';

import styles from './SignalLegend.module.css';

/**
 * Compact construction-signal bar shown above the Intel table.
 * Reads from `CONSTRUCTION_SIGNALS` so the inline strip and the
 * expanded "DETAILS" panel never drift apart.
 */
export function SignalLegend(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.label}>SIGNALS:</span>
        {CONSTRUCTION_SIGNALS.map((sig, i) => (
          <span key={sig.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span className={styles.dot}>·</span>}
            <span
              className={`${styles.signal}${sig.polarity === '-' ? ` ${styles.warn}` : ''}`}
              title={sig.significance}
            >
              {sig.icon}{' '}
              {sig.category.charAt(0) + sig.category.slice(1).toLowerCase()}
            </span>
          </span>
        ))}
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '▾ LESS' : '▸ DETAILS'}
        </button>
      </div>

      {open && (
        <div className={styles.details}>
          <div className={styles.detailsHeading}>CONSTRUCTION SIGNAL DETAILS</div>
          <div className={styles.detailsIntro}>
            Each signal represents physical construction evidence extracted from
            Epoch AI's satellite timeline. Together they tell the buildout
            progression story for each facility.
          </div>
          <div className={styles.detailsGrid}>
            {CONSTRUCTION_SIGNALS.map((sig) => (
              <div key={sig.key} className={styles.detailsCard}>
                <span className={styles.detailsIcon}>{sig.icon}</span>
                <div>
                  <div className={styles.detailsTitle}>{sig.category}</div>
                  <div className={styles.detailsBody}>{sig.significance}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
