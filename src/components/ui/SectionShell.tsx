import type { ReactNode } from 'react';

import styles from './SectionShell.module.css';

export interface SectionShellProps {
  /** Anchor id — wire this into URL hash nav (e.g. "race", "geomap"). */
  id: string;
  /** Uppercase section title (e.g. "THE AI ARMS RACE"). */
  title: string;
  /** Small eyebrow subtitle shown beneath the title. */
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard wrapper for each feature section — `#race`, `#geomap`, etc.
 * Owns the shared title/subtitle chrome and the scroll anchor.
 */
export function SectionShell({
  id,
  title,
  subtitle,
  children,
  className,
}: SectionShellProps): JSX.Element {
  return (
    <section
      id={id}
      className={`${styles.section}${className ? ` ${className}` : ''}`}
    >
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      <div className={styles.content}>{children}</div>
    </section>
  );
}
