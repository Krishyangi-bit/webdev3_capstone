import { useEffect, useState } from 'react';

// Phase 1 placeholder: confirms the React app can reach the API through the
// Vite proxy. Replaced by the router and role workspaces in Phase 8.
export default function App() {
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((body) => setHealth({ state: 'ok', database: body.data?.database }))
      .catch(() => setHealth({ state: 'error' }));
  }, []);

  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h1>CampusFix</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>Report it. Track it. Get it fixed.</p>
      <p style={{ marginTop: 'var(--space-4)' }}>
        API: {health.state === 'loading' && 'checking...'}
        {health.state === 'ok' && `reachable, database ${health.database}`}
        {health.state === 'error' && 'unreachable - is the backend running?'}
      </p>
    </main>
  );
}
