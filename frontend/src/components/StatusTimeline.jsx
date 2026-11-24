import { formatDateTime, timeAgo } from '../utils/format';
import { ROLE_LABEL } from '../constants';

// Vertical history of status changes, oldest first.
export default function StatusTimeline({ history }) {
  return (
    <ol className="timeline">
      {history.map((entry) => (
        <li key={entry._id} className="timeline__item">
          <span className="timeline__dot" data-status={entry.newStatus} aria-hidden="true" />
          <div>
            <div className="timeline__head">
              {entry.previousStatus ? (
                <>
                  <span className="muted">{entry.previousStatus} →</span> <strong>{entry.newStatus}</strong>
                </>
              ) : (
                <strong>{entry.newStatus}</strong>
              )}
            </div>
            <span className="timeline__meta">
              {entry.changedBy?.name}
              {entry.changedBy?.role && ` · ${ROLE_LABEL[entry.changedBy.role]}`} ·{' '}
              <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
                {timeAgo(entry.createdAt)}
              </time>
            </span>
            {entry.remarks && <p className="timeline__remarks">{entry.remarks}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
