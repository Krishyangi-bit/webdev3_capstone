import Icon from './Icon';
import Button from './Button';

export function LoadingState({ rows = 4, label = 'Loading' }) {
  return (
    <div className="loading-rows" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader" role="status">
      <span className="btn__spinner" aria-hidden="true" />
      <span className="visually-hidden">Loading</span>
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, text, action, compact = false }) {
  return (
    <div className={`state ${compact ? 'state--compact' : ''}`}>
      <span className="state__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="state__title">{title}</span>
      {text && <span className="state__text">{text}</span>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact = false }) {
  return (
    <div className={`state state--error ${compact ? 'state--compact' : ''}`} role="alert">
      <span className="state__icon">
        <Icon name="alert" size={18} />
      </span>
      <span className="state__title">{error?.status === 403 ? 'Access denied' : 'Could not load this'}</span>
      <span className="state__text">{error?.message || 'Something went wrong.'}</span>
      {onRetry && error?.status !== 403 && (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
