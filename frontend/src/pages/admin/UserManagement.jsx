import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import { FilterSelect, SearchInput, Tabs } from '../../components/FormControls';
import { ActiveState, Person } from '../../components/Badges';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getUsers, updateUser } from '../../services/adminService';
import { formatDate } from '../../utils/format';
import { ROLE_LABEL } from '../../constants';

const ROLE_TABS = [
  { value: 'student', label: 'Students' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Administrators' },
  { value: '', label: 'Everyone' },
];

export default function UserManagement() {
  const [params, setParams] = useSearchParams();
  const role = params.has('role') ? params.get('role') : 'student';
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;
  const search = params.get('q') || '';
  const debouncedSearch = useDebouncedValue(search);
  const [toggling, setToggling] = useState(null);
  const toast = useToast();

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value || key === 'role') next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const result = useAsync(() => getUsers({ role, status, search: debouncedSearch, page, limit: 20 }), [role, status, debouncedSearch, page]);

  async function toggleActive(user) {
    setToggling(user._id);
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      toast.success(user.isActive ? 'Account deactivated' : 'Account reactivated', `${user.name} ${user.isActive ? 'can no longer sign in' : 'can sign in again'}.`);
      result.reload();
    } catch (err) {
      toast.error('Could not update account', err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <PageHeader title="Users" description="All CampusFix accounts. Deactivated users are signed out immediately and cannot sign in." />
      <Tabs label="Role" tabs={ROLE_TABS} value={role} onChange={(v) => setParam('role', v)} />
      <div className="filter-bar">
        <SearchInput value={search} onChange={(v) => setParam('q', v)} placeholder="Search name, email, ID, department" />
        <FilterSelect
          label="Account status"
          placeholder="Any status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Deactivated' },
          ]}
          value={status}
          onChange={(v) => setParam('status', v)}
        />
      </div>

      {result.loading ? (
        <div className="panel">
          <LoadingState rows={8} />
        </div>
      ) : result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : result.data.data.users.length === 0 ? (
        <div className="panel">
          <EmptyState icon="users" title="No users found" text="Try a different search or filter." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table data-table--responsive">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>ID / designation</th>
                <th className="num">Complaints</th>
                <th>Joined</th>
                <th>Status</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.data.data.users.map((user) => (
                <tr key={user._id}>
                  <td className="cell-primary">
                    <Person name={user.name} meta={user.email} role={user.role} size={undefined} />
                  </td>
                  <td data-label="Role">
                    <span className="badge">{ROLE_LABEL[user.role]}</span>
                  </td>
                  <td data-label="Department" className="muted">
                    {user.department || '—'}
                  </td>
                  <td data-label="ID / designation" className="muted">
                    {user.role === 'student' ? <span className="code">{user.studentId || '—'}</span> : user.designation || '—'}
                  </td>
                  <td data-label="Complaints" className="num">
                    {user.role === 'student' ? (
                      <>
                        {user.complaints.total}
                        {user.complaints.open > 0 && <span className="subtle"> ({user.complaints.open} open)</span>}
                      </>
                    ) : (
                      <span className="subtle">—</span>
                    )}
                  </td>
                  <td data-label="Joined" className="muted nowrap">
                    {formatDate(user.createdAt)}
                  </td>
                  <td data-label="Status">
                    <ActiveState active={user.isActive} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {user.role !== 'admin' && (
                      <Button size="sm" variant={user.isActive ? 'ghost' : 'secondary'} loading={toggling === user._id} onClick={() => toggleActive(user)}>
                        {user.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={result.data.meta} onPageChange={(p) => setParam('page', String(p))} />
        </div>
      )}
    </>
  );
}
