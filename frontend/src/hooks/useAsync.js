import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader when its dependencies change and exposes
// { data, error, loading, reload, setData }. A reload keeps the current data
// on screen (no loading flash) - used for real-time refreshes.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: prev.data === null, error: null }));
    loaderRef
      .current()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState((prev) => ({ data: prev.data, error, loading: false })));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((updater) => {
    setState((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
