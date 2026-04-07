import styles from './Toggle.module.css';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Optional tooltip text shown via native `title`. */
  title?: string;
}

export interface ToggleProps<T extends string> {
  value: T;
  options: readonly ToggleOption<T>[];
  onChange: (value: T) => void;
  /** Accessible label for the group. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Segmented button group — the `.T` pattern from ai-arms-race.html.
 * Generic over a string union so `value`/`onChange`/`options[].value`
 * all stay narrowly typed (`'h100e' | 'power'`, etc.).
 */
export function Toggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: ToggleProps<T>): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${styles.group}${className ? ` ${className}` : ''}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.title}
            className={`${styles.button}${active ? ` ${styles.active}` : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
