import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Select } from '../../components/FormControls';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { DEPARTMENTS, HOSTELS } from '../../constants';

const EMPTY = { name: '', email: '', password: '', confirmPassword: '', department: '', studentId: '', phone: '', hostel: '' };

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Include at least one letter and one number';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match';
  if (!form.department) errors.department = 'Select your department';
  if (!form.studentId.trim()) errors.studentId = 'Enter your enrolment number';
  if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone)) errors.phone = 'Enter a valid phone number';
  return errors;
}

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setFormError('');
    try {
      const { confirmPassword, ...payload } = form;
      await register({
        ...payload,
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone || undefined,
        hostel: payload.hostel || undefined,
      });
      navigate('/student', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-form-wrap auth-form-wrap--wide">
      <h1>Create a student account</h1>
      <p>Report problems in classrooms, labs, hostels and common areas, and follow them until they are fixed.</p>

      {formError && (
        <div className="callout callout--error" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="alert" />
          <div className="callout__body">{formError}</div>
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Input label="Full name" className="span-all" autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
          <Input label="Campus email" className="span-all" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={errors.email} />
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} error={errors.password} hint="8+ characters with a letter and a number" />
          <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} />
          <Select label="Department" placeholder="Select department" options={DEPARTMENTS} value={form.department} onChange={update('department')} error={errors.department} />
          <Input label="Enrolment number" value={form.studentId} onChange={update('studentId')} error={errors.studentId} placeholder="e.g. 2024CSE017" />
          <Input label="Phone" optional type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} error={errors.phone} />
          <Select label="Hostel" optional placeholder="Day scholar" options={HOSTELS} value={form.hostel} onChange={update('hostel')} />
        </div>
        <Button type="submit" variant="primary" block loading={busy}>
          Create account
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 13 }} className="muted">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
