import { Link } from 'react-router-dom';
import Icon from './Icon';

// One button for every action. Renders a <Link> when `to` is given.
export default function Button({
  variant = 'secondary',
  size,
  icon,
  iconOnly = false,
  loading = false,
  block = false,
  to,
  children,
  className = '',
  type = 'button',
  disabled,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size && `btn--${size}`,
    iconOnly && 'btn--icon',
    block && 'btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {!iconOnly && children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
