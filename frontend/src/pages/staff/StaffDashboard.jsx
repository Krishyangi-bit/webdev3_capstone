import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatStrip from '../../components/StatStrip';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Textarea } from '../../components/FormControls';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import TaskRow from './TaskRow';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useComplaintUpdates } from '../../hooks/useSocketEvent';
import { acceptAssignment, getStaffDashboard, rejectAssignment } from '../../services/staffService';
import { firstName, greeting, formatDateTime } from '../../utils/format';

function DeclineModal({ assignment, onDone, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setError('Please give a reason of at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      await rejectAssignment(assignment._id, reason.trim());
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Decline assignment"
      description={`${assignment.complaint.complaintCode} goes back to the maintenance office for reassignment.`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" form="decline-form" loading={busy}>
            Decline
          </Button>
        </>
      }
    >
      <form id="decline-form" onSubmit={submit}>
        <Textarea label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={error} hint="e.g. On leave this week, needs a plumber" />
      </form>
    </Modal>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const dashboard = useAsync(getStaffDashboard, []);
  const [declining, setDeclining] = useState(null);
  const [accepting, setAccepting] = useState(null);
  useComplaintUpdates(dashboard.reload);

  const data = dashboard.data;

  async function accept(assignment) {
    setAccepting(assignment._id);
    try {
      await acceptAssignment(assignment._id);
      toast.success('Assignment accepted', `${assignment.complaint.complaintCode} moved to your active tasks.`);
      dashboard.reload();
    } catch (err) {
      toast.error('Could not accept', err.message);
    } finally {
      setAccepting(null);
    }
  }

  return (
    <>
      <PageHeader documentTitle="Dashboard" title={`${greeting()}, ${firstName(user.name)}`} description={`${user.designation || 'Maintenance staff'} · tasks are ordered by priority`} />

      {dashboard.error && !data ? (
        <ErrorState error={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <div className="stack">
          <StatStrip
            loading={dashboard.loading}
            stats={[
              { label: 'Waiting for your response', value: data?.totals.pending, tone: data?.totals.pending ? 'warning' : undefined },
              { label: 'Active tasks', value: data?.totals.active, to: '/staff/tasks' },
              { label: 'Overdue', value: data?.totals.overdue, tone: data?.totals.overdue ? 'alert' : undefined, hint: 'Past target fix time' },
              { label: 'Completed', value: data?.totals.completed, to: '/staff/history' },
            ]}
          />

          <section>
            <div className="section__header">
              <h2>New assignments</h2>
              <p>Accept to start, or decline so the office can reassign.</p>
            </div>
            <div className="panel">
              {dashboard.loading ? (
                <LoadingState rows={3} />
              ) : data.pending.length === 0 ? (
                <EmptyState compact icon="check" title="No new assignments" text="New tasks from the maintenance office appear here instantly." />
              ) : (
                <ul className="task-list">
                  {data.pending.map((assignment) => (
                    <li key={assignment._id}>
                      <TaskRow
                        assignment={assignment}
                        actions={
                          <>
                            <Button size="sm" variant="primary" icon="check" loading={accepting === assignment._id} onClick={() => accept(assignment)}>
                              Accept
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setDeclining(assignment)}>
                              Decline
                            </Button>
                          </>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <div className="section__header">
              <h2>Active tasks</h2>
              <Link className="section__link" to="/staff/tasks">
                All tasks
              </Link>
            </div>
            <div className="panel">
              {dashboard.loading ? (
                <LoadingState rows={3} />
              ) : data.active.length === 0 ? (
                <EmptyState compact icon="wrench" title="Nothing in progress" text="Accepted tasks appear here until you resolve them." />
              ) : (
                <ul className="task-list">
                  {data.active.map((assignment) => (
                    <li key={assignment._id}>
                      <TaskRow
                        assignment={assignment}
                        actions={
                          <Button size="sm" variant="secondary" to={`/staff/tasks/${assignment.complaint._id}`}>
                            {assignment.complaint.status === 'In Progress' ? 'Resolve' : 'Start work'}
                          </Button>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {data?.recentCompleted.length > 0 && (
            <section>
              <div className="section__header">
                <h2>Recently completed</h2>
                <Link className="section__link" to="/staff/history">
                  Work history
                </Link>
              </div>
              <div className="table-wrap">
                <table className="data-table data-table--responsive">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Complaint</th>
                      <th>Completed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentCompleted.map((a) => (
                      <tr key={a._id}>
                        <td data-label="ID">
                          <span className="code">{a.complaint.complaintCode}</span>
                        </td>
                        <td className="cell-primary">
                          <Link to={`/staff/tasks/${a.complaint._id}`} className="cell-title">
                            {a.complaint.title}
                          </Link>
                          <span className="cell-sub">{a.complaint.building}</span>
                        </td>
                        <td data-label="Completed" className="muted nowrap">
                          {formatDateTime(a.completedAt)}
                        </td>
                        <td data-label="Status">
                          {a.complaint.feedback?.rating ? `Rated ${a.complaint.feedback.rating}/5` : <span className="muted">{a.complaint.status}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {declining && (
        <DeclineModal
          assignment={declining}
          onClose={() => setDeclining(null)}
          onDone={() => {
            toast.notify({ title: 'Assignment declined', message: 'The maintenance office has been notified.' });
            dashboard.reload();
          }}
        />
      )}
    </>
  );
}
