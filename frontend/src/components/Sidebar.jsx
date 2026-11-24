import { Link, NavLink } from 'react-router-dom';
import Icon from './Icon';
import { Avatar } from './Badges';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ROLE_LABEL } from '../constants';

const NAVIGATION = {
  student: [
    {
      label: 'Complaints',
      items: [
        { to: '/student', label: 'Dashboard', icon: 'home', end: true },
        { to: '/student/complaints/new', label: 'Report an issue', icon: 'plus' },
        { to: '/student/complaints', label: 'My complaints', icon: 'list', end: true },
      ],
    },
  ],
  staff: [
    {
      label: 'Work',
      items: [
        { to: '/staff', label: 'Dashboard', icon: 'home', end: true },
        { to: '/staff/tasks', label: 'Assigned tasks', icon: 'wrench' },
        { to: '/staff/history', label: 'Work history', icon: 'clock' },
      ],
    },
  ],
  admin: [
    {
      label: 'Operations',
      items: [
        { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
        { to: '/admin/complaints', label: 'All complaints', icon: 'inbox' },
        { to: '/admin/analytics', label: 'Analytics', icon: 'chart' },
      ],
    },
    {
      label: 'People',
      items: [
        { to: '/admin/staff', label: 'Staff', icon: 'wrench' },
        { to: '/admin/users', label: 'Users', icon: 'users' },
      ],
    },
  ],
};

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const base = `/${user.role}`;
  const sections = [
    ...NAVIGATION[user.role],
    {
      label: 'Account',
      items: [
        { to: `${base}/notifications`, label: 'Notifications', icon: 'bell', count: unreadCount },
        { to: `${base}/profile`, label: 'Profile', icon: 'user' },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
      <Link to={base} className="sidebar__brand" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden="true">
          <Icon name="check" size={15} strokeWidth={2.75} />
        </span>
        <span>
          <span className="brand-name">CampusFix</span>
          <span className="brand-workspace">{ROLE_LABEL[user.role]} workspace</span>
        </span>
      </Link>

      <nav>
        {sections.map((section) => (
          <div key={section.label} className="nav-section">
            <div className="nav-section__label">{section.label}</div>
            <ul className="nav-list">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className="nav-link" onClick={onNavigate}>
                    <Icon name={item.icon} />
                    {item.label}
                    {item.count > 0 && <span className="nav-link__count">{item.count > 99 ? '99+' : item.count}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <Link to={`${base}/profile`} className="sidebar-user" onClick={onNavigate}>
          <Avatar name={user.name} role={user.role} />
          <span className="sidebar-user__text">
            <span className="sidebar-user__name">{user.name}</span>
            <span className="sidebar-user__email">{user.email}</span>
          </span>
        </Link>
        <button type="button" className="nav-link" style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer' }} onClick={logout}>
          <Icon name="logout" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
