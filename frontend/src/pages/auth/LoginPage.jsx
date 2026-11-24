import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../../components/FormControls';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ROLE_HOME } from '../../constants';

// Seeded demo accounts (see backend/scripts/seed.js). Shown only in development builds.
const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'aarav.sharma@campusfix.edu', password: 'Student@123' },
  { role: 'Staff', email: 'ramesh.kumar@campusfix.edu', password: 'Staff@123' },
  { role: 'Admin', email: 'admin@campusfix.edu', password: 'Admin@123' },
];

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Enter your email address';
    if (!form.password) nextErrors.password = 'Enter your password';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setFormError('');
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      const from = location.state?.from;
      navigate(from && from.startsWith(ROLE_HOME[user.role]) ? from : ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-form-wrap">
      <h1>Sign in</h1>
      <p>Use your campus email to report and track maintenance issues.</p>

      {formError && (
        <div className="callout callout--error" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="alert" />
          <div className="callout__body">{formError}</div>
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" value={form.password} onChange={update('password')} error={errors.password} />
        <Button type="submit" variant="primary" block loading={busy}>
          Sign in
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 13 }} className="muted">
        New student? <Link to="/register">Create an account</Link>
        <br />
        Staff accounts are created by the maintenance office.
      </p>

      {import.meta.env.DEV && (
        <div className="demo-accounts">
          <div className="demo-accounts__label">Demo accounts (development only) — click to fill</div>
          <div className="demo-accounts__list">
            {DEMO_ACCOUNTS.map((account) => (
              <button key={account.role} type="button" className="demo-account" onClick={() => setForm({ email: account.email, password: account.password })}>
                {account.role}
                <span>{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
