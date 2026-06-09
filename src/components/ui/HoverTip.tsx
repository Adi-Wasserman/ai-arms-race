import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from './HoverTip.module.css';

/**
 * Instant, styled hover tooltip — replaces native `title` attributes,
 * which have an OS-imposed ~1s delay and unstyleable rendering.
 *
 * Portaled to document.body so it escapes any `overflow` clipping
 * (same pattern as the OwnershipTable chip-mix popover). Appears
 * immediately on hover/focus, dismisses on leave/blur/scroll/resize.
 * `pointer-events: none` so it never traps the cursor.
 */
interface Anchor {
  x: number;
  y: number;
  /** Render below the anchor when there's no room above. */
  below: boolean;
}

const EDGE_PAD = 180; // half of max-width + margin, keeps the tip on-screen
const TOP_ROOM = 170; // px needed above the anchor before flipping below

export function HoverTip({
  content,
  children,
  wide = false,
}: {
  /** Tooltip body — string or JSX (rows, headers, etc). */
  content: ReactNode;
  /** The hover target. */
  children: ReactNode;
  /** Wider box for multi-row content like the pace arithmetic. */
  wide?: boolean;
}): JSX.Element {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const dismiss = (): void => setAnchor(null);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [anchor]);

  const show = (el: HTMLElement): void => {
    const rect = el.getBoundingClientRect();
    const below = rect.top < TOP_ROOM;
    setAnchor({
      x: Math.min(
        Math.max(rect.left + rect.width / 2, EDGE_PAD),
        window.innerWidth - EDGE_PAD,
      ),
      y: below ? rect.bottom : rect.top,
      below,
    });
  };

  return (
    <span
      className={styles.wrap}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setAnchor(null)}
    >
      {children}
      {anchor &&
        createPortal(
          <div
            className={`${styles.tip}${wide ? ` ${styles.wide}` : ''}${anchor.below ? ` ${styles.below}` : ''}`}
            style={{ left: anchor.x, top: anchor.y }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Labeled row for structured tooltip content. */
export function TipRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowValue}>{value}</span>
      </div>
      {sub && <div className={styles.rowSub}>{sub}</div>}
    </div>
  );
}

/** Bold header line for structured tooltip content. */
export function TipHeader({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.header}>{children}</div>;
}
