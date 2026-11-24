import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatStrip from '../../components/StatStrip';
import Pagination from '../../components/Pagination';
import { Stars, StatusBadge } from '../../components/Badges';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useAsync } from '../../hooks/useAsync';
import { getWorkHistory } from '../../services/staffService';
import { formatDate, formatHours } from '../../utils/format';

const OUTCOME = {
  completed: { label: 'Completed', className: 'tag tag--match' },
  rejected: { label: 'Declined', className: 'tag' },
  reassigned: { label: 'Reassigned', className: 'tag' },
};

function hoursBetween(from, to) {
  return from && to ? (new Date(to) - new Date(from)) / 3600000 : null;
}

export default function WorkHistory() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const result = useAsync(() => getWorkHistory({ page, limit: 15 }), [page]);
  const stats = result.data?.data.stats;

  return (
    <>
      <PageHeader title="Work history" description="Completed, declined and reassigned tasks, with your resolution record." />

      {result.error && !result.data ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : (
        <div className="stack">
          <StatStrip
            loading={result.loading}
            stats={[
              { label: 'Complaints resolved', value: stats?.resolved },
              { label: 'Average time to resolve', value: formatHours(stats?.avgResolutionHours), hint: 'From report to resolution' },
              { label: 'Average rating', value: stats?.avgRating ?? '—', unit: stats?.avgRating ? '/ 5' : undefined },
              { label: 'Ratings received', value: stats?.ratings },
            ]}
          />

          {result.loading ? (
            <div className="panel">
              <LoadingState rows={6} />
            </div>
          ) : result.data.data.assignments.length === 0 ? (
            <div className="panel">
              <EmptyState icon="clock" title="No history yet" text="Tasks you complete, decline or that are reassigned will be listed here." />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table--responsive">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Complaint</th>
                    <th>Outcome</th>
                    <th>Assigned</th>
                    <th className="num">Time taken</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.data.assignments.map((a) => (
                    <tr key={a._id}>
                      <td data-label="ID">
                        <span className="code">{a.complaint.complaintCode}</span>
                      </td>
                      <td className="cell-primary">
                        <Link to={`/staff/tasks/${a.complaint._id}`} className="cell-title">
                          {a.complaint.title}
                        </Link>
                        <span className="cell-sub">
                          {a.complaint.category} · {a.complaint.building}
                        </span>
                      </td>
                      <td data-label="Outcome">
                        <span className={OUTCOME[a.assignmentStatus]?.className}>{OUTCOME[a.assignmentStatus]?.label}</span>
                        {a.assignmentStatus === 'completed' && a.complaint.status !== 'Closed' && (
                          <span style={{ marginLeft: 6 }}>
                            <StatusBadge status={a.complaint.status} />
                          </span>
                        )}
                      </td>
                      <td data-label="Assigned" className="muted nowrap">
                        {formatDate(a.assignedAt)}
                      </td>
                      <td data-label="Time taken" className="num muted">
                        {a.assignmentStatus === 'completed' ? formatHours(hoursBetween(a.assignedAt, a.completedAt)) : '—'}
                      </td>
                      <td data-label="Rating">{a.complaint.feedback?.rating ? <Stars rating={a.complaint.feedback.rating} /> : <span className="subtle">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination meta={result.data.meta} onPageChange={(p) => setParams({ page: String(p) })} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
