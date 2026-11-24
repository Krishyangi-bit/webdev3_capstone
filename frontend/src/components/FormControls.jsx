import { useId } from 'react';
import Icon from './Icon';

// Label + control + hint/error, wired up for screen readers.
export function Field({ label, optional, hint, error, children, className = '' }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label} {optional && <span className="field__optional">(optional)</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function Input({ label, optional, hint, error, className, ...props }) {
  return (
    <Field label={label} optional={optional} hint={hint} error={error} className={className}>
      {(a11y) => <input className="input" {...a11y} {...props} />}
    </Field>
  );
}

export function Textarea({ label, optional, hint, error, className, ...props }) {
  return (
    <Field label={label} optional={optional} hint={hint} error={error} className={className}>
      {(a11y) => <textarea className="textarea" {...a11y} {...props} />}
    </Field>
  );
}

export function Select({ label, optional, hint, error, options, placeholder, className, ...props }) {
  return (
    <Field label={label} optional={optional} hint={hint} error={error} className={className}>
      {(a11y) => (
        <select className="select" {...a11y} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const text = typeof option === 'string' ? option : option.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
      )}
    </Field>
  );
}

// Compact select used in filter bars (no label row).
export function FilterSelect({ label, options, placeholder, value, onChange }) {
  return (
    <select className="select select--sm" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const v = typeof option === 'string' ? option : option.value;
        const text = typeof option === 'string' ? option : option.label;
        return (
          <option key={v} value={v}>
            {text}
          </option>
        );
      })}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search', label = 'Search' }) {
  return (
    <div className="search-input">
      <Icon name="search" size={15} />
      <input
        className="input input--sm"
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className="segmented__count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
