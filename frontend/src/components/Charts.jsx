import { useState } from 'react';

/*
 * Small CSS/SVG charts built from real API data. No chart library.
 * Single-series charts use --chart-1; the two-series trend uses --chart-1
 * and --chart-2 (validated for colour-vision deficiency and contrast).
 */

// Horizontal bars, one per category. Values are direct-labelled.
export function BarList({ items, valueLabel = 'complaints', format = (v) => v, extra }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.label} className="bar-row">
          <span className="bar-row__label" title={item.label}>
            {item.label}
          </span>
          <span className="bar-row__track" aria-hidden="true">
            <span className="bar-row__fill" style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
          </span>
          <span className="bar-row__value">{format(item.value)}</span>
          {extra && extra(item) && <span className="bar-row__extra">{extra(item)}</span>}
          <span className="chart-tip" role="tooltip">
            <strong>{item.label}</strong>
            <br />
            {format(item.value)} {valueLabel}
            {total > 0 && ` · ${Math.round((item.value / total) * 100)}% of total`}
          </span>
        </li>
      ))}
    </ul>
  );
}

// One bar split into status segments, with a legend that carries the counts.
export function StackedBar({ segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div className="stacked-bar" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {visible.map((s) => (
          <span key={s.label} className="stacked-bar__segment" style={{ flexGrow: s.value, '--tone': s.color }}>
            <span className="chart-tip">
              {s.label}: {s.value} ({Math.round((s.value / total) * 100)}%)
            </span>
          </span>
        ))}
      </div>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="legend__swatch" style={{ '--tone': s.color }} />
            {s.label}
            <span className="legend__value">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

// Two-series daily line chart (created vs resolved) with a hover crosshair.
export function TrendChart({ points }) {
  const [hover, setHover] = useState(null);
  const W = 600;
  const H = 200;
  const PAD_TOP = 10;
  const max = Math.max(2, ...points.map((p) => Math.max(p.created, p.resolved)));
  const niceMax = Math.ceil(max / 2) * 2;
  const x = (i) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v) => PAD_TOP + (H - PAD_TOP) * (1 - v / niceMax);
  const path = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const gridLines = [0, niceMax / 2, niceMax];
  const last = points[points.length - 1];
  const hovered = hover !== null ? points[hover] : null;

  return (
    <div className="line-chart">
      <ul className="legend legend--inline" style={{ marginBottom: 12 }}>
        <li>
          <span className="legend__swatch" style={{ '--tone': 'var(--chart-1)' }} />
          Reported
        </li>
        <li>
          <span className="legend__swatch" style={{ '--tone': 'var(--chart-2)' }} />
          Resolved
        </li>
      </ul>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Complaints reported and resolved per day. Latest: ${last.created} reported, ${last.resolved} resolved.`}>
          {gridLines.map((v) => (
            <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={path('created')} fill="none" stroke="var(--chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <path d={path('resolved')} fill="none" stroke="var(--chart-2)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {hovered && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD_TOP} y2={H} stroke="var(--color-border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {/* Point markers drawn in HTML so they stay round when the SVG stretches. */}
        {hovered &&
          ['created', 'resolved'].map((key) => (
            <span
              key={key}
              style={{
                position: 'absolute',
                left: `${(x(hover) / W) * 100}%`,
                top: `${(y(hovered[key]) / H) * 100}%`,
                width: 8,
                height: 8,
                marginLeft: -4,
                marginTop: -4,
                borderRadius: '50%',
                background: key === 'created' ? 'var(--chart-1)' : 'var(--chart-2)',
                boxShadow: '0 0 0 2px var(--color-surface)',
                pointerEvents: 'none',
              }}
            />
          ))}
        <span className="line-chart__y" style={{ position: 'absolute', left: 0, top: 0, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {niceMax}
        </span>
        <div className="line-chart__hit" onMouseLeave={() => setHover(null)} style={{ bottom: 0 }}>
          {points.map((p, i) => (
            <span key={p.date} onMouseEnter={() => setHover(i)} />
          ))}
        </div>
        {hovered && (
          <span
            className="chart-tip"
            style={{
              top: 0,
              left: `${(x(hover) / W) * 100}%`,
              transform: `translateX(${hover > points.length / 2 ? 'calc(-100% - 10px)' : '10px'})`,
            }}
          >
            <strong>{shortDate.format(new Date(hovered.date))}</strong>
            <br />
            Reported: {hovered.created}
            <br />
            Resolved: {hovered.resolved}
          </span>
        )}
      </div>
      <div className="line-chart__axis">
        <span>{shortDate.format(new Date(points[0].date))}</span>
        <span>{shortDate.format(new Date(points[Math.floor(points.length / 2)].date))}</span>
        <span>{shortDate.format(new Date(last.date))}</span>
      </div>
      <details className="chart-table">
        <summary>Show data table</summary>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Reported</th>
                <th className="num">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{shortDate.format(new Date(p.date))}</td>
                  <td className="num">{p.created}</td>
                  <td className="num">{p.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export const STATUS_COLORS = {
  Submitted: 'var(--status-submitted)',
  Assigned: 'var(--status-assigned)',
  Accepted: 'var(--status-accepted)',
  'In Progress': 'var(--status-progress)',
  Resolved: 'var(--status-resolved)',
  Reopened: 'var(--status-reopened)',
  Closed: 'var(--status-closed)',
};
