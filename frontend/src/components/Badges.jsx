import Icon from './Icon';
import { initials } from '../utils/format';

export function StatusBadge({ status }) {
  return (
    <span className="badge status-badge" data-status={status}>
      {status}
    </span>
  );
}

const LEVEL = { Low: 1, Medium: 2, High: 3 };

export function PriorityBadge({ priority }) {
  return (
    <span className="priority" data-priority={priority} data-level={LEVEL[priority]}>
      {priority === 'Critical' ? (
        <span className="priority__critical" aria-hidden="true">
          !
        </span>
      ) : (
        <span className="priority__bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      {priority}
    </span>
  );
}

export function OverdueTag() {
  return (
    <span className="overdue-tag" title="Open longer than the target time for its priority">
      <Icon name="clock" size={12} strokeWidth={2.25} />
      Overdue
    </span>
  );
}

export function Avatar({ name, role, size }) {
  return (
    <span className={`avatar ${size ? `avatar--${size}` : ''}`} data-role={role} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Person({ name, meta, role, size = 'sm' }) {
  if (!name) return <span className="subtle">Unassigned</span>;
  return (
    <span className="person">
      <Avatar name={name} role={role} size={size} />
      <span style={{ minWidth: 0 }}>
        <span className="person__name">{name}</span>
        {meta && <span className="person__meta">{meta}</span>}
      </span>
    </span>
  );
}

export function ActiveState({ active }) {
  return <span className={`active-state ${active ? '' : 'is-inactive'}`}>{active ? 'Active' : 'Deactivated'}</span>;
}

export function Stars({ rating }) {
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? '' : 'is-off'}>
          <Icon name="star" size={13} strokeWidth={0} fill="currentColor" />
        </span>
      ))}
    </span>
  );
}
