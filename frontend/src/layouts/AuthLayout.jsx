import { Link, Outlet } from 'react-router-dom';
import Icon from '../components/Icon';

const STEPS = [
  { title: 'Report it', text: 'Describe the problem, mark the exact room and attach a photo.' },
  { title: 'Track it', text: 'See who is assigned and follow every status change as it happens.' },
  { title: 'Get it fixed', text: 'Confirm the fix, or reopen the complaint if the problem comes back.' },
];

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-main">
        <Link to="/login" className="sidebar__brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="check" size={15} strokeWidth={2.75} />
          </span>
          <span className="brand-name">CampusFix</span>
        </Link>
        <Outlet />
        <p className="auth-footer">Campus maintenance and complaint management · Estate &amp; Maintenance Office</p>
      </div>
      <aside className="auth-aside" aria-label="About CampusFix">
        <div className="auth-aside__inner">
          <h2>One place to report campus maintenance problems and see them through to a fix.</h2>
          <ol className="auth-steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="auth-steps__num">{i + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
