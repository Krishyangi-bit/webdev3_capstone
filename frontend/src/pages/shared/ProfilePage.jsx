import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import { Input, Select, Textarea } from '../../components/FormControls';
import { Avatar } from '../../components/Badges';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { changePassword, updateProfile } from '../../services/userService';
import { formatDate } from '../../utils/format';
import { DEPARTMENTS, HOSTELS, ROLE_LABEL } from '../../constants';

function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    department: user.department || '',
    hostel: user.hostel || '',
    bio: user.bio || '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name';
    if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone)) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone || undefined, bio: form.bio };
      if (user.role !== 'staff') payload.department = form.department || undefined;
      if (user.role === 'student') payload.hostel = form.hostel || undefined;
      const updated = await updateProfile(payload);
      onSaved(updated);
      toast.success('Profile updated');
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error('Profile not saved', err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <Input label="Full name" value={form.name} onChange={update('name')} error={errors.name} />
        <Input label="Phone" optional type="tel" value={form.phone} onChange={update('phone')} error={errors.phone} />
        {user.role === 'student' && (
          <>
            <Select label="Department" options={DEPARTMENTS} placeholder="Select department" value={form.department} onChange={update('department')} />
            <Select label="Hostel" optional options={HOSTELS} placeholder="Day scholar" value={form.hostel} onChange={update('hostel')} />
          </>
        )}
        {user.role === 'admin' && <Input label="Department" optional value={form.department} onChange={update('department')} />}
        <Textarea className="span-all" label="About" optional rows={3} maxLength={300} value={form.bio} onChange={update('bio')} hint={`${form.bio.length}/300`} />
      </div>
      <div>
        <Button type="submit" variant="primary" loading={busy}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword))
      next.newPassword = '8+ characters with a letter and a number';
    if (form.confirm !== form.newPassword) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed', 'Other devices have been signed out.');
    } catch (err) {
      setErrors(err.message.toLowerCase().includes('current') ? { currentPassword: err.message } : err.fieldErrors || {});
      if (!err.message.toLowerCase().includes('current')) toast.error('Password not changed', err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Input label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} error={errors.currentPassword} />
      <div className="form-grid">
        <Input label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={update('newPassword')} error={errors.newPassword} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} error={errors.confirm} />
      </div>
      <div>
        <Button type="submit" variant="secondary" loading={busy}>
          Change password
        </Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const facts = [
    ['Email', user.email],
    ['Role', ROLE_LABEL[user.role]],
    user.studentId && ['Enrolment number', user.studentId],
    user.designation && ['Designation', user.designation],
    user.role === 'staff' && user.department && ['Department', user.department],
    user.specializations?.length > 0 && ['Specializations', user.specializations.join(', ')],
    ['Member since', formatDate(user.createdAt)],
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Profile" description="Your account details. Email and role are managed by the maintenance office." />

      <div className="profile-card">
        <Avatar name={user.name} role={user.role} size="lg" />
        <div>
          <h2>{user.name}</h2>
          <span className="muted">{ROLE_LABEL[user.role]}</span>
        </div>
      </div>

      <section className="form-section">
        <div className="form-section__intro">
          <h2>Account</h2>
          <p>These details can only be changed by an administrator.</p>
        </div>
        <dl className="details-list" style={{ gridTemplateColumns: '160px minmax(0, 1fr)' }}>
          {facts.map(([label, value]) => (
            <div key={label} style={{ display: 'contents' }}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="form-section">
        <div className="form-section__intro">
          <h2>Personal details</h2>
          <p>Shown to maintenance staff working on your complaints.</p>
        </div>
        <ProfileForm user={user} onSaved={setUser} />
      </section>

      <section className="form-section">
        <div className="form-section__intro">
          <h2>Password</h2>
          <p>Changing your password signs out your other devices.</p>
        </div>
        <PasswordForm />
      </section>
    </>
  );
}
