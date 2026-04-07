import { Component, type ErrorInfo, type ReactNode } from 'react';

import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  /** Human-readable section name shown in the fallback heading. */
  name: string;
  children: ReactNode;
  /** Optional custom fallback renderer — receives the caught error. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Per-section error boundary — renders a scoped fallback message when
 * its subtree throws, so one broken feature doesn't black out the whole
 * dashboard. Wrap each `<SectionShell>` in one of these.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div className={styles.fallback} role="alert">
        <div className={styles.heading}>⚠ {this.props.name.toUpperCase()} SECTION FAILED</div>
        <div>This section hit an error. Other sections are unaffected.</div>
        <div className={styles.message}>{error.message}</div>
        <button type="button" className={styles.retry} onClick={this.reset}>
          ↻ RETRY
        </button>
      </div>
    );
  }
}
