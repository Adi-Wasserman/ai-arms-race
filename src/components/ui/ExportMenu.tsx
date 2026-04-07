import { useEffect, useRef, useState } from 'react';

import styles from './ExportMenu.module.css';

export interface ExportMenuItem {
  /** Unique key — also used as the label suffix if none provided. */
  key: string;
  /** Button label (e.g. "CSV"). */
  label: string;
  /** Emoji or single-char icon shown before the label. */
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ExportMenuProps {
  items: readonly ExportMenuItem[];
  /** Trigger button label. Defaults to "EXPORT". */
  triggerLabel?: string;
}

/**
 * Dropdown menu with export options (CSV / JSON / PNG).
 * Closes on outside click or Escape.
 */
export function ExportMenu({
  items,
  triggerLabel = 'EXPORT',
}: ExportMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleItemClick = (item: ExportMenuItem): void => {
    item.onClick();
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${styles.trigger}${open ? ` ${styles.open}` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        📥 {triggerLabel}
        <span className={styles.caret}>▾</span>
      </button>

      {open && (
        <div role="menu" className={styles.menu}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={styles.item}
              onClick={() => handleItemClick(item)}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
