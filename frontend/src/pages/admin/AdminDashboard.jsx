import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatStrip from '../../components/StatStrip';
import ComplaintTable from '../../components/ComplaintTable';
import Button from '../../components/Button';
import { StatusBadge } from '../../components/Badges';
import { BarList, StackedBar, STATUS_COLORS } from '../../components/Charts';
import { AssignModal } from '../../components/ComplaintActions';
import { LoadingState, ErrorState, EmptyState } from '../../components/States';
import { useAsync } from '../../hooks/useAsync';
import { useComplaintUpdates } from '../../hooks/useSocketEvent';
import { getAdminDashboard } from '../../services/adminService';
import { timeAgo } from '../../utils/format';
import { ROLE_LABEL } from '../../constants';

export default function AdminDashboard() {
  const dashboard = useAsync(getAdminDashboard, []);
  const [assigning, setAssigning] = useState(null);
  useComplaintUpdates(dashboard.reload);
  const data = dashboard.data;

  return (
    <>
      <PageHeader
        documentTitle="Dashboard"
        title="Operations overview"
        description="Live view of campus maintenance: what needs attention, who is working on what."
        actions={
          <Button variant="secondary" icon="inbox" to="/admin/complaints?open=true&sort=priority">
            Open queue
          </Button>
        }
      />

      {dashboard.error && !data ? (
        <ErrorState error={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <div className="stack">
          <StatStrip
            loading={dashboard.loading}
            stats={[
              { label: 'Total complaints', value: data?.totals.total, to: '/admin/complaints' },
              { label: 'Unresolved', value: data?.totals.unresolved, to: '/admin/complaints?open=true' },
              { label: 'Unassigned', value: data?.totals.unassigned, tone: data?.totals.unassigned ? 'warning' : undefined, to: '/admin/complaints?assignedTo=unassigned&open=true' },
              { label: 'Critical open', value: data?.totals.critical, tone: data?.totals.critical ? 'alert' : undefined, to: '/admin/complaints?priority=Critical&open=true' },
              { label: 'Overdue', value: data?.totals.overdue, tone: data?.totals.overdue ? 'alert' : undefined, to: '/admin/complaints?overdue=true', hint: 'Past target fix time' },
              { label: 'Resolved', value: data?.totals.resolved, hint: `${data?.totals.resolvedThisWeek ?? 0} this week` },
            ]}
          />

          <section>
            <div className="section__header">
              <h2>Needs attention</h2>
              <p>Overdue work and high-priority complaints nobody has picked up.</p>
            </div>
            {dashboard.loading ? (
              <div className="panel">
                <LoadingState rows={4} />
              </div>
            ) : data.attention.length === 0 ? (
              <div className="panel">
                <EmptyState compact icon="check" title="Nothing needs attention" text="All urgent complaints are assigned and within their target time." />
              </div>
            ) : (
              <ComplaintTable
                complaints={data.attention}
                columns={['code', 'title', 'priority', 'status', 'assignee', 'created']}
                linkTo={(c) => `/admin/complaints/${c._id}`}
                rowAction={(c) =>
                  ['Submitted', 'Reopened'].includes(c.status) ? (
                    <Button size="sm" variant="primary" onClick={() => setAssigning(c)}>
                      Assign
                    </Button>
                  ) : null
                }
              />
            )}
          </section>

          <div className="split--even split">
            <section>
              <div className="section__header">
                <h2>Status distribution</h2>
              </div>
              <div className="panel">
                <div className="panel__body">
                  {dashboard.loading ? (
                    <LoadingState rows={3} />
                  ) : (
                    <StackedBar segments={data.byStatus.map((s) => ({ label: s.key, value: s.count, color: STATUS_COLORS[s.key] }))} />
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="section__header">
                <h2>Open complaints by category</h2>
              </div>
              <div className="panel">
                <div className="panel__body">
                  {dashboard.loading ? (
                    <LoadingState rows={4} />
                  ) : (
                    <BarList valueLabel="open" items={data.openByCategory
                        .filter((c) => c.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((c) => ({ label: c.key, value: c.count }))} />
                  )}
                  {data && data.openByCategory.every((c) => c.count === 0) && <EmptyState compact icon="check" title="No open complaints" />}
                </div>
              </div>
            </section>

            <section>
              <div className="section__header">
                <h2>Staff workload</h2>
                <Link className="section__link" to="/admin/staff">
                  Manage staff
                </Link>
              </div>
              <div className="panel">
                <div className="panel__body">
                  {dashboard.loading ? (
                    <LoadingState rows={4} />
                  ) : data.workload.length === 0 ? (
                    <EmptyState compact icon="users" title="No active staff" />
                  ) : (
                    <BarList
                      valueLabel="open tasks"
                      items={data.workload.map((w) => ({ label: w.name, value: w.open, pending: w.pending }))}
                      extra={(item) => (item.pending ? `${item.pending} awaiting acceptance` : null)}
                    />
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="section__header">
                <h2>Recent activity</h2>
              </div>
              <div className="panel">
                <div className="panel__body">
                  {dashboard.loading ? (
                    <LoadingState rows={5} />
                  ) : (
                    <ul className="feed">
                      {data.recentActivity.map((entry) => (
                        <li key={entry._id} className="feed__item">
                          <span className="timeline__dot" data-status={entry.newStatus} style={{ marginTop: 4 }} aria-hidden="true" />
                          <div className="feed__text">
                            <strong>{entry.changedBy?.name}</strong> <span className="subtle">({ROLE_LABEL[entry.changedBy?.role]})</span>{' '}
                            {entry.previousStatus ? 'moved' : 'reported'}{' '}
                            {entry.complaint && <Link to={`/admin/complaints/${entry.complaint._id}`}>{entry.complaint.complaintCode}</Link>}
                            {entry.previousStatus && (
                              <>
                                {' '}
                                to <StatusBadge status={entry.newStatus} />
                              </>
                            )}
                            <span className="feed__time">{timeAgo(entry.createdAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {assigning && <AssignModal complaint={assigning} onDone={dashboard.reload} onClose={() => setAssigning(null)} />}
    </>
  );
}
