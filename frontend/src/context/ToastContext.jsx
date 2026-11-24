import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

const ToastContext = createContext(null);
const DURATION = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    ({ title, message, tone = 'info', link, linkLabel }) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, title, message, tone, link, linkLabel }]);
      setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      notify,
      success: (title, message) => notify({ title, message, tone: 'success' }),
      error: (title, message) => notify({ title, message, tone: 'error' }),
    }),
    [notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <div className="toast__body">
              <div className="toast__title">{toast.title}</div>
              {toast.message && <div className="toast__message">{toast.message}</div>}
              {toast.link && (
                <Link className="toast__link" to={toast.link} onClick={() => dismiss(toast.id)}>
                  {toast.linkLabel || 'View'}
                </Link>
              )}
            </div>
            <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
