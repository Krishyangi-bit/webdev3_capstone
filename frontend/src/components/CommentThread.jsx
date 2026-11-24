import { useState } from 'react';
import { Avatar } from './Badges';
import Button from './Button';
import { EmptyState } from './States';
import { addComment } from '../services/complaintService';
import { useToast } from '../context/ToastContext';
import { formatDateTime, timeAgo } from '../utils/format';
import { ROLE_LABEL } from '../constants';

const MAX = 1000;

// Comments between the reporter, assigned staff and administrators.
// New comments from others arrive through the complaint's socket room.
export default function CommentThread({ complaintId, comments, onAdded, closed, placeholder }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setSending(true);
    try {
      const comment = await addComment(complaintId, text);
      onAdded(comment);
      setMessage('');
    } catch (err) {
      toast.error('Comment not posted', err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="comments-title">
      <h2 id="comments-title">
        Comments <span className="subtle">{comments.length > 0 && comments.length}</span>
      </h2>
      {comments.length === 0 ? (
        <EmptyState compact icon="message" title="No comments yet" text="Use comments to share updates or ask questions about this complaint." />
      ) : (
        <ol className="comments">
          {comments.map((comment) => (
            <li key={comment._id} className="comment">
              <Avatar name={comment.author?.name} role={comment.author?.role} />
              <div>
                <div className="comment__head">
                  <strong>{comment.author?.name}</strong>
                  <span className="tag">{ROLE_LABEL[comment.author?.role]}</span>
                  <time className="comment__time" dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)}>
                    {timeAgo(comment.createdAt)}
                  </time>
                </div>
                <p className="comment__message">{comment.message}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {closed ? (
        <p className="subtle" style={{ marginTop: 16, fontSize: 13 }}>
          This complaint is closed. Comments are no longer accepted.
        </p>
      ) : (
        <form className="comment-form" onSubmit={handleSubmit}>
          <label htmlFor="comment-input" className="visually-hidden">
            Add a comment
          </label>
          <textarea
            id="comment-input"
            className="textarea"
            rows={3}
            maxLength={MAX}
            placeholder={placeholder || 'Write a comment…'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
            }}
          />
          <div className="comment-form__actions">
            <span>
              {message.length}/{MAX} · Ctrl + Enter to send
            </span>
            <Button type="submit" variant="primary" size="sm" icon="send" loading={sending} disabled={!message.trim()}>
              Comment
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
