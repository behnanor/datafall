import { useCallback, useLayoutEffect, useRef } from 'react';

// Returns a function whose identity never changes but always calls the latest `fn`.
// Used for handlers passed to memoized views, so a handler that depends on per-tick state
// does not force those views to re-render on every game tick.
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
