import { useLocation } from 'react-router-dom';
import Icon from './Icon';
import Button from './Button';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const SECTION_TITLES = [
  [/\/complaints\/new$/, 'Report an issue'],
  [/\/complaints\/[^/]+$/, 'Complaint details'],
  [/\/complaints$/, 'Complaints'],
  [/\/tasks\/[^/]+$/, 'Task details'],
  [/\/tasks$/, 'Assigned tasks'],
  [/\/history$/, 'Work history'],
  [/\/analytics$/, 'Analytics'],
  [/^\/admin\/staff$/, 'Staff'],
  [/^\/admin\/users$/, 'Users'],
  [/\/notifications$/, 'Notifications'],
  [/\/profile$/, 'Profile'],
];

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const { pathname } = useLocation();
  const title = SECTION_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] || 'Dashboard';

  return (
    <header className="topbar">
      <button type="button" className="btn btn--ghost btn--icon topbar__menu" aria-label="Open navigation" onClick={onMenu}>
        <Icon name="menu" size={18} />
      </button>
      <div className="topbar__crumbs">
        <span>CampusFix</span>
        <Icon name="chevronRight" size={13} />
        <strong>{title}</strong>
      </div>
      <div className="topbar__actions">
        <span
          className={`connection-dot ${connected ? 'is-live' : ''}`}
          title={connected ? 'Live updates connected' : 'Live updates reconnecting…'}
          role="img"
          aria-label={connected ? 'Live updates connected' : 'Live updates disconnected'}
        />
        {user.role === 'student' && /^\/student\/(complaints\/[^/n][^/]*|notifications|profile)$/.test(pathname) && (
          <Button variant="primary" size="sm" icon="plus" to="/student/complaints/new">
            New complaint
          </Button>
        )}
        <NotificationPanel />
      </div>
    </header>
  );
}
