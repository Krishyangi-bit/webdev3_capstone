import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge, OverdueTag, Person } from './Badges';
import { timeAgo, locationLabel } from '../utils/format';

/*
 * Table of complaints with configurable columns.
 *   columns: any of 'code','title','category','priority','status','reporter','assignee','updated','created'
 *   rowAction(complaint) -> optional element rendered in a trailing cell
 */
const COLUMN_LABELS = {
  code: 'ID',
  title: 'Complaint',
  category: 'Category',
  priority: 'Priority',
  status: 'Status',
  reporter: 'Reported by',
  assignee: 'Assigned to',
  updated: 'Updated',
  created: 'Reported',
};

function renderCell(column, c) {
  switch (column) {
    case 'code':
      return <span className="code">{c.complaintCode}</span>;
    case 'title':
      return (
        <>
          <span className="cell-title">{c.title}</span>
          <span className="cell-sub">{locationLabel(c)}</span>
        </>
      );
    case 'category':
      return <span className="muted">{c.category}</span>;
    case 'priority':
      return <PriorityBadge priority={c.priority} />;
    case 'status':
      return (
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={c.status} />
          {c.isOverdue && <OverdueTag />}
        </span>
      );
    case 'reporter':
      return <Person name={c.reportedBy?.name} role="student" />;
    case 'assignee':
      return <Person name={c.assignedTo?.name} role="staff" />;
    case 'updated':
      return <span className="muted nowrap">{timeAgo(c.updatedAt)}</span>;
    case 'created':
      return <span className="muted nowrap">{timeAgo(c.createdAt)}</span>;
    default:
      return null;
  }
}

export default function ComplaintTable({ complaints, columns, linkTo, rowAction, footer }) {
  const navigate = useNavigate();

  return (
    <div className="table-wrap">
      <table className="data-table data-table--responsive">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {COLUMN_LABELS[column]}
              </th>
            ))}
            {rowAction && (
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr
              key={c._id}
              className="is-clickable"
              onClick={(event) => {
                if (event.target.closest('button, a')) return;
                navigate(linkTo(c));
              }}
            >
              {columns.map((column) => (
                <td key={column} data-label={column === 'title' ? undefined : COLUMN_LABELS[column]} className={column === 'title' ? 'cell-primary' : undefined}>
                  {column === 'title' ? (
                    <a
                      href={linkTo(c)}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(linkTo(c));
                      }}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {renderCell(column, c)}
                    </a>
                  ) : (
                    renderCell(column, c)
                  )}
                </td>
              ))}
              {rowAction && <td className="nowrap">{rowAction(c)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
  );
}
