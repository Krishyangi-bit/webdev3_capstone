import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { Textarea } from './FormControls';
import { Avatar } from './Badges';
import { LoadingState, ErrorState } from './States';
import { useToast } from '../context/ToastContext';
import { reopenComplaint, submitFeedback, updateStatus } from '../services/complaintService';
import { acceptAssignment, rejectAssignment } from '../services/staffService';
import { assignComplaint, closeComplaint, getStaff } from '../services/adminService';

/* ------------------------------------------------------------ generic */

// Modal with one text field and a confirm button. Used for most actions.
function TextActionModal({ title, description, label, hint, minLength = 0, required = true, confirmLabel, variant = 'primary', onSubmit, onClose }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tooShort = required && text.trim().length < minLength;

  async function handleSubmit(event) {
    event.preventDefault();
    if (tooShort) {
      setError(`Please write at least ${minLength} characters.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(text.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err.fieldErrors ? Object.values(err.fieldErrors)[0] || err.message : err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={variant} type="submit" form="text-action-form" loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id="text-action-form" onSubmit={handleSubmit}>
        <Textarea label={label} optional={!required} hint={hint} error={error} rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------ student */

export function FeedbackModal({ complaint, onDone, onClose }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirming = complaint.status === 'Resolved';

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) {
      setError('Choose a rating from 1 to 5.');
      return;
    }
    setBusy(true);
    try {
      const updated = await submitFeedback(complaint._id, { rating, comment: comment.trim() || undefined });
      toast.success(confirming ? 'Complaint closed' : 'Feedback submitted', 'Thank you for rating the work.');
      onDone(updated);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={confirming ? 'Confirm the fix' : 'Rate the work'}
      description={confirming ? 'Confirming closes the complaint. Your rating is shared with the maintenance team.' : 'Your rating is shared with the maintenance team.'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="feedback-form" loading={busy}>
            {confirming ? 'Confirm and close' : 'Submit rating'}
          </Button>
        </>
      }
    >
      <form id="feedback-form" className="form" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field__label" id="rating-label">
            How satisfied are you with the fix?
          </span>
          <div className="rating" role="radiogroup" aria-labelledby="rating-label">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={n <= rating ? 'is-on' : ''}
                onClick={() => {
                  setRating(n);
                  setError('');
                }}
              >
                <Icon name="star" size={18} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          {error && <span className="field__error">{error}</span>}
        </div>
        <Textarea label="Comment" optional rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything the team should know?" />
      </form>
    </Modal>
  );
}

export function StudentActions({ complaint, onUpdated }) {
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const canConfirm = complaint.status === 'Resolved';
  const canRateLater = complaint.status === 'Closed' && complaint.resolvedAt && !complaint.feedback?.rating;
  if (!canConfirm && !canRateLater) return null;

  return (
    <div className="action-panel">
      {canConfirm ? (
        <p>Maintenance marked this as resolved. Check that the problem is fixed, then confirm it or reopen the complaint.</p>
      ) : (
        <p>This complaint was closed. You can still rate the work.</p>
      )}
      <div className="action-panel__buttons">
        <Button variant="primary" icon="check" onClick={() => setModal('feedback')}>
          {canConfirm ? 'Confirm fix and rate' : 'Rate the work'}
        </Button>
        {canConfirm && (
          <Button variant="secondary" icon="rotate" onClick={() => setModal('reopen')}>
            Problem not fixed – reopen
          </Button>
        )}
      </div>
      {modal === 'feedback' && <FeedbackModal complaint={complaint} onDone={onUpdated} onClose={() => setModal(null)} />}
      {modal === 'reopen' && (
        <TextActionModal
          title="Reopen complaint"
          description="The assigned staff member and the maintenance office will be notified."
          label="What is still wrong?"
          hint="At least 10 characters"
          minLength={10}
          confirmLabel="Reopen complaint"
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            const updated = await reopenComplaint(complaint._id, reason);
            toast.success('Complaint reopened', 'Maintenance has been notified.');
            onUpdated(updated);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ staff */

export function StaffActions({ complaint, assignment, onUpdated }) {
  const [modal, setModal] = useState(null);
  const toast = useToast();

  if (!assignment) return null;
  const pending = assignment.assignmentStatus === 'pending' && complaint.status === 'Assigned';
  const canStart = assignment.assignmentStatus === 'accepted' && ['Accepted', 'Reopened'].includes(complaint.status);
  const canResolve = assignment.assignmentStatus === 'accepted' && complaint.status === 'In Progress';
  if (!pending && !canStart && !canResolve) return null;

  return (
    <div className="action-panel">
      {pending && <p>This complaint has been assigned to you. Accept it to start, or decline with a reason so it can be reassigned.</p>}
      {canStart && <p>{complaint.status === 'Reopened' ? 'The student reports the problem persists.' : 'You accepted this task.'} Mark it in progress when you start work on site.</p>}
      {canResolve && <p>When the problem is fixed, mark it resolved and describe what was done.</p>}
      <div className="action-panel__buttons">
        {pending && (
          <>
            <Button
              variant="primary"
              icon="check"
              onClick={async () => {
                try {
                  await acceptAssignment(assignment._id);
                  toast.success('Assignment accepted', 'The student has been notified.');
                  onUpdated();
                } catch (err) {
                  toast.error('Could not accept', err.message);
                }
              }}
            >
              Accept assignment
            </Button>
            <Button variant="danger-outline" icon="x" onClick={() => setModal('decline')}>
              Decline
            </Button>
          </>
        )}
        {canStart && (
          <Button variant="primary" icon="play" onClick={() => setModal('start')}>
            Start work
          </Button>
        )}
        {canResolve && (
          <Button variant="primary" icon="check" onClick={() => setModal('resolve')}>
            Mark as resolved
          </Button>
        )}
      </div>

      {modal === 'decline' && (
        <TextActionModal
          title="Decline assignment"
          description="The complaint goes back to the maintenance office for reassignment."
          label="Reason"
          hint="At least 10 characters, e.g. on leave, needs a different trade"
          minLength={10}
          confirmLabel="Decline assignment"
          variant="danger"
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await rejectAssignment(assignment._id, reason);
            toast.notify({ title: 'Assignment declined', message: 'The admin team has been notified.' });
            onUpdated();
          }}
        />
      )}
      {modal === 'start' && (
        <TextActionModal
          title="Start work"
          description="The student will see that work is in progress."
          label="Progress note"
          required={false}
          confirmLabel="Mark in progress"
          onClose={() => setModal(null)}
          onSubmit={async (remarks) => {
            await updateStatus(complaint._id, { status: 'In Progress', remarks });
            toast.success('Marked in progress');
            onUpdated();
          }}
        />
      )}
      {modal === 'resolve' && (
        <TextActionModal
          title="Resolve complaint"
          description="The student will be asked to confirm the fix."
          label="Resolution notes"
          hint="What was the cause and what did you do? At least 10 characters."
          minLength={10}
          confirmLabel="Mark as resolved"
          onClose={() => setModal(null)}
          onSubmit={async (resolutionNotes) => {
            await updateStatus(complaint._id, { status: 'Resolved', resolutionNotes });
            toast.success('Complaint resolved', 'The student has been asked to confirm.');
            onUpdated();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ admin */

export function AssignModal({ complaint, onDone, onClose }) {
  const [staff, setStaff] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const currentId = complaint.assignedTo?._id || complaint.assignedTo;

  useEffect(() => {
    getStaff({ category: complaint.category, activeOnly: true })
      .then(setStaff)
      .catch(setLoadError);
  }, [complaint.category]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) {
      setError('Choose a staff member.');
      return;
    }
    setBusy(true);
    try {
      const updated = await assignComplaint(complaint._id, { staffId: selected, remarks: remarks.trim() || undefined });
      toast.success('Complaint assigned', `${updated.assignedTo.name} has been notified.`);
      onDone(updated);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      wide
      title={currentId ? 'Reassign complaint' : 'Assign complaint'}
      description={`${complaint.complaintCode} · ${complaint.category} · ${complaint.priority} priority`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="assign-form" loading={busy}>
            {currentId ? 'Reassign' : 'Assign'}
          </Button>
        </>
      }
    >
      <form id="assign-form" className="form" onSubmit={handleSubmit}>
        {loadError && <ErrorState compact error={loadError} />}
        {!staff && !loadError && <LoadingState rows={3} />}
        {staff && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field__label" style={{ marginBottom: 8 }}>
              Staff member <span className="field__optional">· specialists for {complaint.category} are listed first</span>
            </legend>
            <ul className="staff-picker">
              {staff.map((member) => {
                const isCurrent = member._id === currentId && complaint.status !== 'Reopened';
                return (
                  <li key={member._id}>
                    <label className="staff-option" style={isCurrent ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>
                      <input type="radio" name="staff" value={member._id} checked={selected === member._id} disabled={isCurrent} onChange={() => setSelected(member._id)} />
                      <span className="person">
                        <Avatar name={member.name} role="staff" />
                        <span style={{ minWidth: 0 }}>
                          <span className="person__name">
                            {member.name} {isCurrent && <span className="subtle">(current)</span>}
                          </span>
                          <span className="person__meta">{member.designation}</span>
                          <span className="tag-list" style={{ marginTop: 4 }}>
                            {(member.specializations || []).map((s) => (
                              <span key={s} className={`tag ${s === complaint.category ? 'tag--match' : ''}`}>
                                {s}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                      <span className="staff-option__load">
                        <strong>{member.workload.open}</strong>
                        open {member.workload.critical > 0 && `· ${member.workload.critical} critical`}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
        <Textarea label="Note for the staff member" optional rows={2} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Room is free after 4 PM" />
        {error && <span className="field__error">{error}</span>}
      </form>
    </Modal>
  );
}

const ASSIGNABLE = ['Submitted', 'Assigned', 'Accepted', 'In Progress', 'Reopened'];
const CLOSABLE = ['Submitted', 'Resolved', 'Reopened'];

export function AdminActions({ complaint, onUpdated }) {
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const canAssign = ASSIGNABLE.includes(complaint.status);
  const canClose = CLOSABLE.includes(complaint.status);
  if (!canAssign && !canClose) return null;

  const hint = {
    Submitted: 'This complaint is waiting to be assigned to a staff member.',
    Reopened: 'The student reopened this complaint. Reassign it or ask the same staff member to continue.',
    Resolved: 'Waiting for the student to confirm. You can close it after an inspection.',
  }[complaint.status];

  return (
    <div className="action-panel">
      {hint && <p>{hint}</p>}
      <div className="action-panel__buttons">
        {canAssign && (
          <Button variant={['Submitted', 'Reopened'].includes(complaint.status) ? 'primary' : 'secondary'} icon="userPlus" onClick={() => setModal('assign')}>
            {complaint.assignedTo ? 'Reassign' : 'Assign to staff'}
          </Button>
        )}
        {canClose && (
          <Button variant="secondary" icon="lock" onClick={() => setModal('close')}>
            {complaint.status === 'Submitted' ? 'Close as invalid or duplicate' : 'Close complaint'}
          </Button>
        )}
      </div>
      {modal === 'assign' && <AssignModal complaint={complaint} onDone={onUpdated} onClose={() => setModal(null)} />}
      {modal === 'close' && (
        <TextActionModal
          title="Close complaint"
          description="The reporter and assigned staff will be notified. Closed complaints cannot be reopened."
          label="Reason for closing"
          minLength={5}
          confirmLabel="Close complaint"
          onClose={() => setModal(null)}
          onSubmit={async (remarks) => {
            const updated = await closeComplaint(complaint._id, remarks);
            toast.success('Complaint closed');
            onUpdated(updated);
          }}
        />
      )}
    </div>
  );
}
