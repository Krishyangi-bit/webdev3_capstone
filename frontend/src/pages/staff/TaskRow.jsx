import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { StatusBadge, PriorityBadge, OverdueTag } from '../../components/Badges';
import { locationLabel, timeAgo } from '../../utils/format';

// One assignment in the staff task lists. `actions` renders quick buttons.
export default function TaskRow({ assignment, actions }) {
  const c = assignment.complaint;
  return (
    <div className="task-row">
      <div style={{ minWidth: 0 }}>
        <div className="task-row__title">
          <span className="code">{c.complaintCode}</span>
          <Link to={`/staff/tasks/${c._id}`}>{c.title}</Link>
        </div>
        <div className="task-row__meta">
          <PriorityBadge priority={c.priority} />
          <StatusBadge status={c.status} />
          {c.isOverdue && <OverdueTag />}
          <span>
            <Icon name="mapPin" size={12} />
            {locationLabel(c)}
          </span>
          <span>
            <Icon name="clock" size={12} />
            Assigned {timeAgo(assignment.assignedAt)}
            {assignment.assignedBy?.name && ` by ${assignment.assignedBy.name}`}
          </span>
        </div>
        {assignment.remarks && <p className="task-row__note">Note: {assignment.remarks}</p>}
      </div>
      {actions && <div className="task-row__actions">{actions}</div>}
    </div>
  );
}
