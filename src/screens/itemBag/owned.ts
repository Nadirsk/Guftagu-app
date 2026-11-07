import { api } from '../../api/client';
import type { StoreItem } from '../store/parts';

/** `GET /store/items/mine` — `StoreController::mine()`: what you own, unexpired. */
export type OwnedItem = StoreItem & { expires_at: string | null; source: string; equipped: boolean };

/**
 * The last answer, shared by the Item Bag and the Profile, so either paints at once
 * (the Profile's frame included) while a fresh request runs behind it.
 */
let last: OwnedItem[] | null = null;

export const cachedOwned = () => last;

export function rememberOwned(items: OwnedItem[]) {
  last = items;
}

export async function fetchOwned(token: string | null): Promise<OwnedItem[]> {
  const res = await api<OwnedItem[]>('/store/items/mine', { token });
  last = Array.isArray(res) ? res : [];
  return last;
}

/** What you are wearing of one type, if anything. */
export const equippedOf = (items: OwnedItem[] | null, type: string) => items?.find((i) => i.type === type && i.equipped);
