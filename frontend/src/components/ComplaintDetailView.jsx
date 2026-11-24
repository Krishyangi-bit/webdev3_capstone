import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { StatusBadge, PriorityBadge, OverdueTag, Person, Stars } from './Badges';
import { LoadingState, ErrorState } from './States';
import StatusTimeline from './StatusTimeline';
import CommentThread from './CommentThread';
import { useAsync } from '../hooks/useAsync';
import { useSocket } from '../context/SocketContext';
import { useSocketEvent, useComplaintUpdates } from '../hooks/useSocketEvent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getComplaint, getComments } from '../services/complaintService';
import { formatDateTime, locationLabel, slaDueDate, timeAgo } from '../utils/format';

const ASSIGNMENT_LABEL = {
  pending: 'Awaiting response',
  accepted: 'Accepted',
  rejected: 'Declined',
  completed: 'Completed',
  reassigned: 'Reassigned',
};

/*
 * Full complaint page shared by every role. Role-specific actions are passed
 * in through renderActions({ complaint, assignments, reload, replaceComplaint }).
 * The page joins the complaint's Socket.IO room for live comments and status.
 */
export default function ComplaintDetailView({ complaintId, back, renderActions, showAssignments = false }) {
  const details = useAsync(() => getComplaint(complaintId), [complaintId]);
  const comments = useAsync(() => getComments(complaintId), [complaintId]);
  const { socket } = useSocket();
  const [, forceTick] = useState(0);

  useDocumentTitle(details.data?.complaint ? `${details.data.complaint.complaintCode} ${details.data.complaint.title}` : 'Complaint');

  // Join the complaint room (and re-join after a reconnect).
  useEffect(() => {
    if (!socket) return undefined;
    const join = () => socket.emit('complaint:join', complaintId, () => {});
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('complaint:leave', complaintId);
    };
  }, [socket, complaintId]);

  useComplaintUpdates(() => {
    details.reload();
    comments.reload();
  }, complaintId);

  useSocketEvent('comment:new', (comment) => {
    if (comment.complaint !== complaintId) return;
    comments.setData((list) => (list && !list.some((c) => c._id === comment._id) ? [...list, comment] : list));
  });

  // Keep relative times fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (details.loading) return <LoadingState rows={8} />;
  if (details.error) return <ErrorState error={details.error} onRetry={details.reload} />;

  const { complaint, history, assignments } = details.data;
  const replaceComplaint = (updated) => {
    if (updated) details.setData((d) => ({ ...d, complaint: { ...d.complaint, ...updated } }));
    details.reload();
  };
  const actions = renderActions?.({ complaint, assignments, reload: details.reload, replaceComplaint });
  const due = slaDueDate(complaint);
  const isOpen = !['Resolved', 'Closed'].includes(complaint.status);

  return (
    <>
      <Link to={back.to} className="back-link">
        <Icon name="arrowLeft" size={14} />
        {back.label}
      </Link>

      <header className="complaint-head">
        <div className="complaint-head__badges">
          <span className="code">{complaint.complaintCode}</span>
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          {complaint.isOverdue && <OverdueTag />}
        </div>
        <h1>{complaint.title}</h1>
        <div className="complaint-head__meta">
          <span>
            <Icon name="tag" size={13} />
            {complaint.category}
          </span>
          <span>
            <Icon name="mapPin" size={13} />
            {locationLabel(complaint)}
          </span>
          <span>
            <Icon name="calendar" size={13} />
            Reported {timeAgo(complaint.createdAt)}
          </span>
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section>
            <h2>Description</h2>
            <p className="prose">{complaint.description}</p>
            {complaint.location && (
              <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>Location details:</strong> {complaint.location}
              </p>
            )}
          </section>

          {complaint.images?.length > 0 && (
            <section>
              <h2>Photos</h2>
              <div className="gallery">
                {complaint.images.map((src, i) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    <img src={src} alt={`Photo ${i + 1} of the reported problem`} loading="lazy" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {complaint.resolutionNotes && (
            <section>
              <h2>Resolution</h2>
              <div className="resolution-block">
                <span className="resolution-block__label">
                  {complaint.assignedTo?.name ? `${complaint.assignedTo.name}` : 'Maintenance'}
                  {complaint.resolvedAt && ` · ${formatDateTime(complaint.resolvedAt)}`}
                </span>
                <p className="prose">{complaint.resolutionNotes}</p>
              </div>
            </section>
          )}

          {complaint.feedback?.rating && (
            <section>
              <h2>Reporter feedback</h2>
              <p>
                <Stars rating={complaint.feedback.rating} /> <strong style={{ marginLeft: 6 }}>{complaint.feedback.rating}/5</strong>
              </p>
              {complaint.feedback.comment && <p className="muted" style={{ marginTop: 6 }}>“{complaint.feedback.comment}”</p>}
            </section>
          )}

          {comments.error ? (
            <ErrorState compact error={comments.error} onRetry={comments.reload} />
          ) : (
            <CommentThread
              complaintId={complaintId}
              comments={comments.data || []}
              closed={complaint.status === 'Closed'}
              onAdded={(comment) => comments.setData((list) => (list?.some((c) => c._id === comment._id) ? list : [...(list || []), comment]))}
            />
          )}
        </div>

        <aside className="detail-side">
          {actions && (
            <div className="panel panel--actions">
              <div className="panel__header">
                <h3>Actions</h3>
              </div>
              <div className="panel__body">{actions}</div>
            </div>
          )}

          <div className="panel">
            <div className="panel__header">
              <h3>Details</h3>
            </div>
            <div className="panel__body">
              <dl className="details-list">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={complaint.status} />
                </dd>
                <dt>Reported by</dt>
                <dd>
                  <Person name={complaint.reportedBy?.name} meta={complaint.reportedBy?.department} role="student" />
                </dd>
                <dt>Assigned to</dt>
                <dd>
                  <Person name={complaint.assignedTo?.name} meta={complaint.assignedTo?.designation} role="staff" />
                </dd>
                {complaint.assignedTo?.phone && (
                  <>
                    <dt>Staff contact</dt>
                    <dd>{complaint.assignedTo.phone}</dd>
                  </>
                )}
                <dt>Building</dt>
                <dd>{complaint.building}</dd>
                <dt>Floor / room</dt>
                <dd>
                  {complaint.floor}
                  {complaint.roomNumber ? ` / ${complaint.roomNumber}` : ''}
                  {complaint.block ? ` · ${complaint.block}` : ''}
                </dd>
                <dt>Reported</dt>
                <dd>{formatDateTime(complaint.createdAt)}</dd>
                <dt>Last updated</dt>
                <dd>{formatDateTime(complaint.updatedAt)}</dd>
                {isOpen && (
                  <>
                    <dt>Target fix by</dt>
                    <dd style={complaint.isOverdue ? { color: 'var(--color-error)' } : undefined}>{formatDateTime(due)}</dd>
                  </>
                )}
                {complaint.reopenCount > 0 && (
                  <>
                    <dt>Reopened</dt>
                    <dd>
                      {complaint.reopenCount} time{complaint.reopenCount > 1 ? 's' : ''}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {showAssignments && assignments.length > 0 && (
            <div className="panel">
              <div className="panel__header">
                <h3>Assignments</h3>
              </div>
              <div className="panel__body">
                <ol className="assignment-trail">
                  {assignments.map((a) => (
                    <li key={a._id}>
                      <div className="assignment-trail__row">
                        <strong>{a.assignedTo?.name}</strong>
                        <span className="tag">{ASSIGNMENT_LABEL[a.assignmentStatus]}</span>
                      </div>
                      <span className="subtle" style={{ fontSize: 12 }}>
                        by {a.assignedBy?.name} · {formatDateTime(a.assignedAt)}
                      </span>
                      {a.remarks && <span className="muted">Note: {a.remarks}</span>}
                      {a.responseNote && <span className="muted">Reason: {a.responseNote}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel__header">
              <h3>Status history</h3>
            </div>
            <div className="panel__body">
              <StatusTimeline history={history} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
