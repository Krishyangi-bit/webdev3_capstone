import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatStrip from '../../components/StatStrip';
import { Segmented } from '../../components/FormControls';
import { BarList, StackedBar, TrendChart, STATUS_COLORS } from '../../components/Charts';
import { LoadingState, ErrorState } from '../../components/States';
import { useAsync } from '../../hooks/useAsync';
import { getAnalytics, getStaffPerformance } from '../../services/adminService';
import { formatHours } from '../../utils/format';
import { SLA_HOURS } from '../../constants';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '12 months' },
];

function Panel({ title, description, children }) {
  return (
    <section>
      <div className="section__header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="panel">
        <div className="panel__body">{children}</div>
      </div>
    </section>
  );
}

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const days = Number(params.get('days')) || 30;
  const analytics = useAsync(() => getAnalytics(days), [days]);
  const performance = useAsync(() => getStaffPerformance(days), [days]);
  const data = analytics.data;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Calculated from complaint records with MongoDB aggregation pipelines."
        actions={<Segmented label="Time range" options={RANGES} value={days} onChange={(v) => setParams({ days: String(v) })} />}
      />

      {analytics.error && !data ? (
        <ErrorState error={analytics.error} onRetry={analytics.reload} />
      ) : (
        <div className="stack">
          <StatStrip
            loading={analytics.loading}
            stats={[
              { label: 'Complaints reported', value: data?.totals.total },
              { label: 'Resolved', value: data?.totals.resolved, hint: data?.totals.total ? `${Math.round((data.totals.resolved / data.totals.total) * 100)}% of reported` : undefined },
              { label: 'Waiting assignment', value: data?.totals.pending },
              { label: 'Critical', value: data?.totals.critical },
              { label: 'Average time to resolve', value: formatHours(data?.totals.avgResolutionHours) },
              { label: 'Average rating', value: data?.totals.avgRating ?? '—', unit: data?.totals.avgRating ? '/ 5' : undefined },
              { label: 'Reopen rate', value: data?.totals.reopenRate ?? '—', unit: data?.totals.reopenRate !== null && data ? '%' : undefined, hint: 'Fixes reported back as not working' },
            ]}
          />

          <Panel title="Reported vs resolved" description={`Per day, last ${Math.min(days, 90)} days`}>
            {analytics.loading ? <LoadingState rows={5} /> : <TrendChart points={data.trend} />}
          </Panel>

          <div className="split split--even">
            <Panel title="By category" description="Count, with average time to resolve">
              {analytics.loading ? (
                <LoadingState rows={6} />
              ) : (
                <BarList
                  items={[...data.byCategory].sort((a, b) => b.count - a.count).map((c) => ({ label: c.key, value: c.count, avg: c.avgResolutionHours, resolved: c.resolved }))}
                  extra={(item) => (item.value === 0 ? null : `${item.resolved} resolved · avg ${formatHours(item.avg)}`)}
                />
              )}
            </Panel>

            <Panel title="By priority" description="Average time to resolve against the target">
              {analytics.loading ? (
                <LoadingState rows={4} />
              ) : (
                <BarList
                  items={[...data.byPriority].reverse().map((p) => ({ label: p.key, value: p.count, avg: p.avgResolutionHours }))}
                  extra={(item) =>
                    item.avg === null ? null : `avg ${formatHours(item.avg)} · target ${formatHours(SLA_HOURS[item.label])}${item.avg > SLA_HOURS[item.label] ? ' · over target' : ''}`
                  }
                />
              )}
            </Panel>

            <Panel title="By building" description="Total reported, with currently open">
              {analytics.loading ? (
                <LoadingState rows={6} />
              ) : data.byBuilding.length === 0 ? (
                <p className="muted">No complaints in this period.</p>
              ) : (
                <BarList items={data.byBuilding.map((b) => ({ label: b.key, value: b.count, open: b.open }))} extra={(item) => (item.open ? `${item.open} open` : null)} />
              )}
            </Panel>

            <Panel title="Current status" description="Complaints reported in this period">
              {analytics.loading ? <LoadingState rows={3} /> : <StackedBar segments={data.byStatus.map((s) => ({ label: s.key, value: s.count, color: STATUS_COLORS[s.key] }))} />}
            </Panel>
          </div>

          <section>
            <div className="section__header">
              <h2>Staff performance</h2>
              <p>Assignments received in this period and the complaints they resolved.</p>
            </div>
            {performance.loading ? (
              <div className="panel">
                <LoadingState rows={5} />
              </div>
            ) : performance.error ? (
              <ErrorState error={performance.error} onRetry={performance.reload} />
            ) : (
              <div className="table-wrap">
                <table className="data-table data-table--responsive">
                  <thead>
                    <tr>
                      <th>Staff member</th>
                      <th className="num">Assigned</th>
                      <th className="num">Declined</th>
                      <th className="num">Open</th>
                      <th className="num">Resolved</th>
                      <th className="num">Avg. response</th>
                      <th className="num">Avg. resolution</th>
                      <th className="num">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.data.map((s) => (
                      <tr key={s._id}>
                        <td className="cell-primary">
                          <span className="cell-title">
                            {s.name} {!s.isActive && <span className="subtle">(deactivated)</span>}
                          </span>
                          <span className="cell-sub">{s.designation}</span>
                        </td>
                        <td data-label="Assigned" className="num">
                          {s.assigned}
                        </td>
                        <td data-label="Declined" className="num">
                          {s.rejected}
                        </td>
                        <td data-label="Open" className="num">
                          {s.open}
                        </td>
                        <td data-label="Resolved" className="num">
                          {s.resolved}
                        </td>
                        <td data-label="Avg. response" className="num muted">
                          {formatHours(s.avgResponseHours)}
                        </td>
                        <td data-label="Avg. resolution" className="num muted">
                          {formatHours(s.avgResolutionHours)}
                        </td>
                        <td data-label="Rating" className="num">
                          {s.avgRating ? `${s.avgRating} / 5` : <span className="subtle">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
