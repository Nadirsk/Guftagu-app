import { useSyncExternalStore } from 'react';

/**
 * The withdrawal method the user has linked (Figma section 346:6627). The server has no place to
 * keep it yet — `POST /withdrawals` only takes `{diamonds, method}` — so it lives in memory for the
 * session, and a restart starts unlinked. Only one method is linked at a time, as the design shows.
 */

export type MethodKind = 'binance' | 'bank' | 'upi';

export const METHOD_LABEL: Record<MethodKind, string> = { binance: 'Binance', bank: 'Bank', upi: 'UPI' };

export type LinkedMethod = {
  kind: MethodKind;
  /** The bold line of the linked row: the UPI account, the card number's tail, the Binance network. */
  title: string;
  /** The grey line under it. */
  subtitle: string;
};

let linked: LinkedMethod | null = null;
/** Set when a method was just linked, so the method screen shows "Withdrawal method added" once. */
let justLinked = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function linkMethod(method: LinkedMethod) {
  linked = method;
  justLinked = true;
  emit();
}

export function unlinkMethod() {
  linked = null;
  justLinked = false;
  emit();
}

/** True once after a link, then false. */
export function takeJustLinked(): boolean {
  const was = justLinked;
  justLinked = false;
  return was;
}

export function useLinkedMethod(): LinkedMethod | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => linked,
  );
}
