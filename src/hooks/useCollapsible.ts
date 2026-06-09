import { useEffect, useState } from 'react';

/**
 * Collapsible-card state with optional localStorage persistence.
 *
 * Storage semantics are backward compatible with the per-card helpers
 * this replaces (FirstPrinciples / KnownLeasesCard): the key holds '1'
 * when COLLAPSED and is removed when open, so previously saved keys
 * keep working unchanged.
 */
export function useCollapsible(options?: {
  /** Persist across sessions under this localStorage key. Omit for in-memory only. */
  storageKey?: string;
  /** Initial state when nothing is stored. Default: open. */
  defaultOpen?: boolean;
}): { open: boolean; toggle: () => void } {
  const { storageKey, defaultOpen = true } = options ?? {};

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (!storageKey || typeof window === 'undefined') return !defaultOpen;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored == null ? !defaultOpen : stored === '1';
    } catch {
      return !defaultOpen;
    }
  });

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      if (collapsed) window.localStorage.setItem(storageKey, '1');
      else window.localStorage.removeItem(storageKey);
    } catch {
      /* localStorage unavailable — silent no-op */
    }
  }, [collapsed, storageKey]);

  return { open: !collapsed, toggle: () => setCollapsed((v) => !v) };
}
