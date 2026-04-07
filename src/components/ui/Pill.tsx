import type { ButtonHTMLAttributes } from 'react';

import styles from './Pill.module.css';

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Use the green "export" accent styling. */
  variant?: 'default' | 'export';
}

/**
 * Filter pill — the `.P` pattern from ai-arms-race.html.
 * Used for lab filters, status filters, and export-bar buttons.
 */
export function Pill({
  active,
  variant = 'default',
  className,
  children,
  type = 'button',
  ...rest
}: PillProps): JSX.Element {
  const classes = [
    styles.pill,
    active ? styles.active : '',
    variant === 'export' ? styles.export : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
