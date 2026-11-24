import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ComplaintTable from '../../components/ComplaintTable';
import Pagination from '../../components/Pagination';
import Button from '../../components/Button';
import { FilterSelect, SearchInput } from '../../components/FormControls';
import { AssignModal } from '../../components/ComplaintActions';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useComplaintUpdates } from '../../hooks/useSocketEvent';
import { getAllComplaints, getStaff } from '../../services/adminService';
import { BUILDINGS, CATEGORIES, PRIORITIES, STATUSES } from '../../constants';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'priority', label: 'Highest priority' },
];

const FILTER_KEYS = ['q', 'status', 'category', 'priority', 'building', 'assignedTo', 'open', 'overdue'];

export default function AllComplaints() {
  const [params, setParams] = useSearchParams();
  const [assigning, setAssigning] = useState(null);
  const [staff, setStaff] = useState([]);
  const get = (key) => params.get(key) || '';
  const page = Number(params.get('page')) || 1;
  const search = useDebouncedValue(get('q'));

  useEffect(() => {
    getStaff()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const query = {
    search,
    status: get('status'),
    category: get('category'),
    priority: get('priority'),
    building: get('building'),
    assignedTo: get('assignedTo'),
    open: get('open') === 'true',
    overdue: get('overdue') === 'true',
    sort: get('sort') || 'newest',
    page,
    limit: 20,
  };
  const result = useAsync(() => getAllComplaints(query), [JSON.stringify(query)]);
  useComplaintUpdates(result.reload);

  const hasFilters = FILTER_KEYS.some((k) => params.get(k));

  return (
    <>
      <PageHeader title="All complaints" description="Every complaint across campus. Filters are kept in the address bar, so a filtered view can be bookmarked or shared." />

      <div className="filter-bar">
        <SearchInput value={get('q')} onChange={(v) => setParam('q', v)} placeholder="Search title, ID, room" />
        <FilterSelect label="Status" placeholder="Any status" options={STATUSES} value={get('status')} onChange={(v) => setParam('status', v)} />
        <FilterSelect label="Category" placeholder="Any category" options={CATEGORIES} value={get('category')} onChange={(v) => setParam('category', v)} />
        <FilterSelect label="Priority" placeholder="Any priority" options={PRIORITIES} value={get('priority')} onChange={(v) => setParam('priority', v)} />
        <FilterSelect label="Building" placeholder="Any building" options={BUILDINGS} value={get('building')} onChange={(v) => setParam('building', v)} />
        <FilterSelect
          label="Assigned to"
          placeholder="Anyone"
          options={[{ value: 'unassigned', label: 'Unassigned' }, ...staff.map((s) => ({ value: s._id, label: s.name }))]}
          value={get('assignedTo')}
          onChange={(v) => setParam('assignedTo', v)}
        />
      </div>
      <div className="filter-bar">
        <label className="toggle">
          <input type="checkbox" checked={get('open') === 'true'} onChange={(e) => setParam('open', e.target.checked ? 'true' : '')} />
          Open only
        </label>
        <label className="toggle">
          <input type="checkbox" checked={get('overdue') === 'true'} onChange={(e) => setParam('overdue', e.target.checked ? 'true' : '')} />
          Overdue only
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setParams(get('sort') ? { sort: get('sort') } : {}, { replace: true })}>
            Clear filters
          </Button>
        )}
        <span className="filter-bar__spacer" />
        <FilterSelect label="Sort" placeholder="Sort: newest" options={SORTS.slice(1)} value={get('sort') === 'newest' ? '' : get('sort')} onChange={(v) => setParam('sort', v)} />
      </div>

      {result.loading ? (
        <div className="panel">
          <LoadingState rows={8} />
        </div>
      ) : result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : result.data.data.complaints.length === 0 ? (
        <div className="panel">
          <EmptyState title="No complaints match" text={hasFilters ? 'Try removing a filter.' : 'Complaints reported by students will appear here.'} />
        </div>
      ) : (
        <ComplaintTable
          complaints={result.data.data.complaints}
          columns={['code', 'title', 'category', 'priority', 'status', 'reporter', 'assignee', 'created']}
          linkTo={(c) => `/admin/complaints/${c._id}`}
          rowAction={(c) =>
            ['Submitted', 'Reopened'].includes(c.status) ? (
              <Button size="sm" variant="primary" onClick={() => setAssigning(c)}>
                Assign
              </Button>
            ) : null
          }
          footer={<Pagination meta={result.data.meta} onPageChange={(p) => setParam('page', String(p))} />}
        />
      )}

      {assigning && <AssignModal complaint={assigning} onDone={result.reload} onClose={() => setAssigning(null)} />}
    </>
  );
}
