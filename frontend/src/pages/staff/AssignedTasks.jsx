import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { Tabs } from '../../components/FormControls';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import TaskRow from './TaskRow';
import { useAsync } from '../../hooks/useAsync';
import { useComplaintUpdates } from '../../hooks/useSocketEvent';
import { getAssignments } from '../../services/staffService';

const VIEWS = [
  { value: 'current', label: 'All current' },
  { value: 'pending', label: 'Waiting for response' },
  { value: 'active', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
];

const EMPTY_TEXT = {
  current: 'You have no open tasks right now.',
  pending: 'No assignments are waiting for your response.',
  active: 'You have not accepted any open tasks.',
  completed: 'Resolved tasks will appear here.',
};

export default function AssignedTasks() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'current';
  const page = Number(params.get('page')) || 1;

  const result = useAsync(() => getAssignments({ view, page, limit: 15 }), [view, page]);
  useComplaintUpdates(result.reload);

  return (
    <>
      <PageHeader title="Assigned tasks" description="Complaints assigned to you, highest priority first." />
      <Tabs label="Task filter" tabs={VIEWS} value={view} onChange={(v) => setParams(v === 'current' ? {} : { view: v })} />

      {result.loading ? (
        <div className="panel">
          <LoadingState rows={5} />
        </div>
      ) : result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : result.data.data.assignments.length === 0 ? (
        <div className="panel">
          <EmptyState icon="wrench" title="Nothing here" text={EMPTY_TEXT[view]} />
        </div>
      ) : (
        <div className="panel">
          <ul className="task-list">
            {result.data.data.assignments.map((assignment) => (
              <li key={assignment._id}>
                <TaskRow assignment={assignment} />
              </li>
            ))}
          </ul>
          <Pagination
            meta={result.data.meta}
            onPageChange={(p) => {
              const next = new URLSearchParams(params);
              next.set('page', String(p));
              setParams(next);
            }}
          />
        </div>
      )}
    </>
  );
}
