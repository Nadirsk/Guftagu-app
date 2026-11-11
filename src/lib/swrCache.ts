/**
 * Show-then-refresh cache for lists a sheet opens with.
 *
 * The first open has nothing to show, so the sheet shows its spinner. Every open
 * after that starts from what was fetched last time — no spinner — while the
 * request runs quietly; the screen only changes if the answer is different.
 */
import { api } from '../api/client';

const store = new Map<string, unknown>();

/** Keys carry the token tail so one account never sees another's cached rows. */
const keyOf = (path: string, token?: string | null) => `${token ? token.slice(-12) : ''}|${path}`;

/** What was fetched last time (through `map`, if the caller reshapes it), or `null` the first time. */
export function peek<T, R = T>(path: string, token?: string | null, map?: (raw: T) => R): R | null {
  const raw = store.get(keyOf(path, token)) as T | undefined;
  if (raw === undefined) return null;
  return map ? map(raw) : (raw as unknown as R);
}

/**
 * Fetch `path`, run it through `map`, and hand the result to `onData` and remember it.
 * The sheet already shows the cached copy, so an unchanged answer looks like nothing happened. Returns a cancel function for effect cleanup.
 */
export function refresh<T, R = T>(
  path: string,
  token: string | null | undefined,
  onData: (value: R) => void,
  map?: (raw: T) => R,
  onError?: () => void,
): () => void {
  let live = true;
  const key = keyOf(path, token);
  api<T>(path, { token })
    .then((raw) => {
      if (!live) return;
      // The raw answer is what is cached, so every screen can read one path its own way.
      store.set(key, raw);
      onData(map ? map(raw) : (raw as unknown as R));
    })
    .catch(() => {
      if (live) onError?.();
    });
  return () => {
    live = false;
  };
}
