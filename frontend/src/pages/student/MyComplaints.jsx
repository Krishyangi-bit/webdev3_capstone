import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ComplaintTable from '../../components/ComplaintTable';
import Pagination from '../../components/Pagination';
import Button from '../../components/Button';
import { FilterSelect, SearchInput } from '../../components/FormControls';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useComplaintUpdates } from '../../hooks/useSocketEvent';
import { getMyComplaints } from '../../services/complaintService';
import { CATEGORIES, STATUSES } from '../../constants';

export default function MyComplaints() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  const search = params.get('q') || '';
  const debouncedSearch = useDebouncedValue(search);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const result = useAsync(
    () => getMyComplaints({ status, category, search: debouncedSearch, page, limit: 15 }),
    [status, category, debouncedSearch, page]
  );
  useComplaintUpdates(result.reload);

  const filtered = status || category || search;

  return (
    <>
      <PageHeader
        title="My complaints"
        description="Everything you have reported, most recently updated first."
        actions={
          <Button variant="primary" icon="plus" to="/student/complaints/new">
            Report an issue
          </Button>
        }
      />

      <div className="filter-bar">
        <SearchInput value={search} onChange={(v) => setParam('q', v)} placeholder="Search title or ID" />
        <FilterSelect label="Status" placeholder="All statuses" options={STATUSES} value={status} onChange={(v) => setParam('status', v)} />
        <FilterSelect label="Category" placeholder="All categories" options={CATEGORIES} value={category} onChange={(v) => setParam('category', v)} />
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </Button>
        )}
      </div>

      {result.loading ? (
        <div className="panel">
          <LoadingState rows={6} />
        </div>
      ) : result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : result.data.data.complaints.length === 0 ? (
        <div className="panel">
          <EmptyState
            title={filtered ? 'No complaints match these filters' : "You haven't reported anything yet"}
            text={filtered ? 'Try a different status or clear the filters.' : 'Report a problem and it will appear here.'}
            action={
              !filtered && (
                <Button variant="primary" icon="plus" to="/student/complaints/new">
                  Report an issue
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ComplaintTable
          complaints={result.data.data.complaints}
          columns={['code', 'title', 'category', 'priority', 'status', 'assignee', 'updated']}
          linkTo={(c) => `/student/complaints/${c._id}`}
          footer={<Pagination meta={result.data.meta} onPageChange={(p) => setParam('page', String(p))} />}
        />
      )}
    </>
  );
}
