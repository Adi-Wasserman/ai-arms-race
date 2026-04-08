import { useEffect, useRef, useState } from 'react';

import { TruthModal } from '@/components/ui/TruthModal';
import { useDashboard } from '@/store';

import styles from './DataBanner.module.css';

type BannerStatus = 'loading' | 'ok' | 'stale' | 'error';

interface StatusDescriptor {
  status: BannerStatus;
  text: string;
}

/** Derive the banner state from the data slice. */
function deriveStatus(
  loading: boolean,
  error: string | null,
  dataSource: 'epoch' | 'fallback' | null,
  dataCenters: number,
): StatusDescriptor {
  if (loading) return { status: 'loading', text: 'Loading Epoch data…' };
  if (error && dataSource !== 'epoch') {
    return { status: 'error', text: `Fetch failed — ${error}` };
  }
  if (dataSource === 'fallback') {
    return { status: 'stale', text: `Fallback data — ${dataCenters} facilities` };
  }
  return { status: 'ok', text: `Live — Epoch AI · ${dataCenters} facilities` };
}

export function DataBanner(): JSX.Element {
  const loading = useDashboard((s) => s.loading);
  const error = useDashboard((s) => s.error);
  const dataSource = useDashboard((s) => s.dataSource);
  const dataCenters = useDashboard((s) => s.dataCenters.length);
  const lastUpdated = useDashboard((s) => s.lastUpdated);

  const { status, text } = deriveStatus(loading, error, dataSource, dataCenters);

  const [copied, setCopied] = useState(false);
  const [truthOpen, setTruthOpen] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending copy-confirmation timer on unmount.
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleRefresh = (): void => {
    window.location.reload();
  };

  const handleShare = (): void => {
    /**
     * Copy the current URL (including `#section?metric=…&scope=…&…`
     * hash params written by useHashState) to the clipboard. The hash
     * round-trips the current view state, so pasting the link elsewhere
     * opens the dashboard with the same filters + toggles applied.
     */
    const url = window.location.href;

    const flashCopied = (): void => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1200);
    };

    // Prefer the async Clipboard API; fall back to the legacy
    // document.execCommand path if the browser blocks it (file://,
    // insecure context, Safari private mode, etc).
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(flashCopied).catch(() => {
        fallbackCopy(url, flashCopied);
      });
    } else {
      fallbackCopy(url, flashCopied);
    }
  };

  return (
    <>
      <div className={`${styles.banner} ${styles[status]}`}>
        <div className={styles.left}>
          <span className={`${styles.dot} ${styles[status]}`} />
          <span>{text}</span>
          {lastUpdated && (
            <>
              <span className={styles.separator}>·</span>
              <span className={styles.meta}>
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
        <div className={styles.actions}>
          {/* Methodology trigger — anchors the row because it
              answers "how was this data made" before any other
              action makes sense. Same button style as the data-
              action buttons to the right so it reads as an equal
              peer, not a heavy CTA. */}
          <button
            type="button"
            className={`${styles.button} ${styles.buttonInfo}`}
            onClick={() => setTruthOpen(true)}
            title="Sources, override table, uncertainty notes"
            aria-haspopup="dialog"
          >
            ⓘ ABOUT THIS DATA
          </button>
          <button type="button" className={styles.button} onClick={handleRefresh}>
            ↻ REFRESH DATA
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={handleShare}
            aria-live="polite"
          >
            {copied ? '✓ COPIED' : '📋 SHARE VIEW'}
          </button>
        </div>
      </div>
      <TruthModal open={truthOpen} onClose={() => setTruthOpen(false)} />
    </>
  );
}

/**
 * Last-resort clipboard fallback for environments where the async API
 * is unavailable. Creates a hidden textarea, selects the text, and
 * fires `document.execCommand('copy')`.
 */
function fallbackCopy(text: string, onSuccess: () => void): void {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) onSuccess();
  } catch {
    /* silent */
  }
}
