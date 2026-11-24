import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatStrip from '../../components/StatStrip';
import ComplaintTable from '../../components/ComplaintTable';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { StatusBadge } from '../../components/Badges';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useComplaintUpdates } from '../../hooks/useSocketEvent';
import { getMySummary } from '../../services/complaintService';
import { firstName, greeting, timeAgo } from '../../utils/format';

function ActivityFeed({ activity }) {
  if (!activity.length) return <EmptyState compact icon="clock" title="No activity yet" />;
  return (
    <ul className="feed">
      {activity.map((entry) => (
        <li key={entry._id} className="feed__item">
          <span className="timeline__dot" data-status={entry.newStatus} style={{ marginTop: 4 }} aria-hidden="true" />
          <div className="feed__text">
            <Link to={`/student/complaints/${entry.complaint._id}`}>{entry.complaint.complaintCode}</Link>{' '}
            {entry.previousStatus ? 'moved to' : 'was'} <StatusBadge status={entry.newStatus} />
            {entry.changedBy?.role !== 'student' && (
              <>
                {' '}
                by <strong>{entry.changedBy?.name}</strong>
              </>
            )}
            <span className="feed__time">{timeAgo(entry.createdAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const summary = useAsync(getMySummary, []);
  useComplaintUpdates(summary.reload);

  const data = summary.data;
  const awaiting = data?.recent.filter((c) => c.status === 'Resolved') || [];

  return (
    <>
      <PageHeader
        documentTitle="Dashboard"
        title={`${greeting()}, ${firstName(user.name)}`}
        description="Here is where your maintenance requests stand."
        actions={
          <Button variant="primary" icon="plus" to="/student/complaints/new">
            Report an issue
          </Button>
        }
      />

      {summary.error && !data ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : (
        <div className="stack">
          <StatStrip
            loading={summary.loading}
            stats={[
              { label: 'Total reported', value: data?.totals.total, to: '/student/complaints' },
              { label: 'Open', value: data?.totals.open, hint: 'Waiting or being worked on' },
              { label: 'Resolved', value: data?.totals.resolved },
              {
                label: 'Awaiting your confirmation',
                value: data?.totals.awaitingConfirmation,
                tone: data?.totals.awaitingConfirmation ? 'warning' : undefined,
                to: '/student/complaints?status=Resolved',
              },
            ]}
          />

          {awaiting.length > 0 && (
            <div className="callout callout--info">
              <Icon name="info" />
              <div className="callout__body">
                <strong>{awaiting[0].complaintCode}</strong> was marked resolved. Check that the problem is fixed and confirm it, or reopen it.
              </div>
              <div className="callout__actions">
                <Button size="sm" variant="primary" to={`/student/complaints/${awaiting[0]._id}`}>
                  Review
                </Button>
              </div>
            </div>
          )}

          <div className="split">
            <section>
              <div className="section__header">
                <h2>Recent complaints</h2>
                <Link className="section__link" to="/student/complaints">
                  View all
                </Link>
              </div>
              {summary.loading ? (
                <div className="panel">
                  <LoadingState />
                </div>
              ) : data.recent.length === 0 ? (
                <div className="panel">
                  <EmptyState
                    title="You haven't reported anything yet"
                    text="Broken fan, leaking tap or no Wi-Fi? Report it and track it here until it is fixed."
                    action={
                      <Button variant="primary" icon="plus" to="/student/complaints/new">
                        Report an issue
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ComplaintTable complaints={data.recent} columns={['code', 'title', 'status', 'updated']} linkTo={(c) => `/student/complaints/${c._id}`} />
              )}
            </section>

            <section>
              <div className="section__header">
                <h2>Recent activity</h2>
              </div>
              <div className="panel">
                <div className="panel__body">{summary.loading ? <LoadingState rows={5} /> : <ActivityFeed activity={data.activity} />}</div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
