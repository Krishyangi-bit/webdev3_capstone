import { Link } from 'react-router-dom';

// A single row of key figures separated by dividers.
export default function StatStrip({ stats, loading }) {
  return (
    <div className="stat-strip">
      {stats.map((stat) => {
        const Tag = stat.to ? Link : 'div';
        return (
          <Tag key={stat.label} className={`stat ${stat.tone ? `stat--${stat.tone}` : ''}`} to={stat.to}>
            <span className="stat__label">{stat.label}</span>
            <span className="stat__value">
              {loading ? <span className="skeleton" style={{ width: 40, height: 24 }} /> : stat.value ?? '—'}
              {!loading && stat.unit && <span className="stat__unit">{stat.unit}</span>}
            </span>
            {stat.hint && <span className="stat__hint">{stat.hint}</span>}
          </Tag>
        );
      })}
    </div>
  );
}
