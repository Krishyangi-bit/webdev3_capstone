import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Input } from '../../components/FormControls';
import { ActiveState, Person } from '../../components/Badges';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { createStaff, getStaff, updateUser } from '../../services/adminService';
import { CATEGORIES } from '../../constants';

const EMPTY = { name: '', email: '', password: '', phone: '', designation: '', department: 'Estate & Maintenance Office', specializations: [] };

function StaffFormModal({ staff, onSaved, onClose }) {
  const editing = Boolean(staff);
  const [form, setForm] = useState(
    editing
      ? { name: staff.name, phone: staff.phone || '', designation: staff.designation || '', department: staff.department || '', specializations: staff.specializations || [] }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleSpecialization = (category) =>
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(category) ? f.specializations.filter((c) => c !== category) : [...f.specializations, category],
    }));

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter the full name';
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!editing && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)))
      next.password = '8+ characters with a letter and a number';
    if (!/^[0-9+\-\s]{7,15}$/.test(form.phone)) next.phone = 'Enter a valid phone number';
    if (!form.designation.trim()) next.designation = 'Enter a designation';
    if (form.specializations.length === 0) next.specializations = 'Choose at least one category';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFormError('');
    try {
      const payload = { ...form, name: form.name.trim(), designation: form.designation.trim(), department: form.department.trim() || undefined };
      if (editing) {
        await updateUser(staff._id, payload);
        toast.success('Staff details updated');
      } else {
        await createStaff({ ...payload, email: form.email.trim() });
        toast.success('Staff account created', `${payload.name} can now sign in with the temporary password.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      wide
      title={editing ? `Edit ${staff.name}` : 'Add staff member'}
      description={editing ? 'Email address and role cannot be changed.' : 'Share the temporary password with the staff member. They can change it from their profile.'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="staff-form" loading={busy}>
            {editing ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id="staff-form" className="form" onSubmit={handleSubmit} noValidate>
        {formError && <span className="field__error">{formError}</span>}
        <div className="form-grid">
          <Input label="Full name" value={form.name} onChange={update('name')} error={errors.name} />
          <Input label="Designation" placeholder="e.g. Senior Electrician" value={form.designation} onChange={update('designation')} error={errors.designation} />
          {!editing && <Input label="Email" type="email" value={form.email} onChange={update('email')} error={errors.email} />}
          {!editing && <Input label="Temporary password" type="text" autoComplete="off" value={form.password} onChange={update('password')} error={errors.password} />}
          <Input label="Phone" type="tel" value={form.phone} onChange={update('phone')} error={errors.phone} />
          <Input label="Department" optional value={form.department} onChange={update('department')} />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label" style={{ marginBottom: 6 }}>
            Specializations
          </legend>
          <div className="checkbox-group">
            {CATEGORIES.map((category) => (
              <label key={category} className="checkbox-pill">
                <input type="checkbox" checked={form.specializations.includes(category)} onChange={() => toggleSpecialization(category)} />
                {category}
              </label>
            ))}
          </div>
          <span className={errors.specializations ? 'field__error' : 'field__hint'} style={{ display: 'block', marginTop: 6 }}>
            {errors.specializations || 'Used to suggest the right person when assigning complaints.'}
          </span>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function StaffManagement() {
  const staff = useAsync(() => getStaff(), []);
  const [modal, setModal] = useState(null);
  const [toggling, setToggling] = useState(null);
  const toast = useToast();

  async function toggleActive(member) {
    setToggling(member._id);
    try {
      await updateUser(member._id, { isActive: !member.isActive });
      toast.success(member.isActive ? 'Account deactivated' : 'Account reactivated', member.name);
      staff.reload();
    } catch (err) {
      toast.error('Could not update account', err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Maintenance staff"
        description="Staff accounts, their trades and current workload."
        actions={
          <Button variant="primary" icon="userPlus" onClick={() => setModal({ type: 'create' })}>
            Add staff member
          </Button>
        }
      />

      {staff.loading ? (
        <div className="panel">
          <LoadingState rows={6} />
        </div>
      ) : staff.error ? (
        <ErrorState error={staff.error} onRetry={staff.reload} />
      ) : staff.data.length === 0 ? (
        <div className="panel">
          <EmptyState icon="users" title="No staff accounts yet" text="Add maintenance staff so complaints can be assigned." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table data-table--responsive">
            <thead>
              <tr>
                <th>Name</th>
                <th>Specializations</th>
                <th>Phone</th>
                <th className="num">Open tasks</th>
                <th className="num">Resolved</th>
                <th>Status</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.data.map((member) => (
                <tr key={member._id}>
                  <td className="cell-primary">
                    <Person name={member.name} meta={`${member.designation || 'Staff'} · ${member.email}`} role="staff" size={undefined} />
                  </td>
                  <td data-label="Specializations">
                    <span className="tag-list">
                      {(member.specializations || []).map((s) => (
                        <span key={s} className="tag">
                          {s}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td data-label="Phone" className="muted nowrap">
                    {member.phone || '—'}
                  </td>
                  <td data-label="Open tasks" className="num">
                    {member.workload.open}
                    {member.workload.critical > 0 && <span style={{ color: 'var(--color-error)', marginLeft: 4 }}>({member.workload.critical} critical)</span>}
                  </td>
                  <td data-label="Resolved" className="num">
                    {member.workload.resolved}
                  </td>
                  <td data-label="Status">
                    <ActiveState active={member.isActive} />
                  </td>
                  <td className="nowrap" style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => setModal({ type: 'edit', staff: member })}>
                      Edit
                    </Button>
                    <Button size="sm" variant={member.isActive ? 'ghost' : 'secondary'} loading={toggling === member._id} onClick={() => toggleActive(member)}>
                      {member.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <StaffFormModal staff={modal.staff} onSaved={staff.reload} onClose={() => setModal(null)} />}
    </>
  );
}
