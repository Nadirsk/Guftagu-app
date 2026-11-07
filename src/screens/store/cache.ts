import { File, Paths } from 'expo-file-system';
import { Image, Platform } from 'react-native';

import type { StoreItem } from './parts';

/**
 * The last `GET /store/items` answer, kept in memory and on disk so the Store
 * opens with its grid already drawn - also after a restart - while a fresh
 * request runs behind it and swaps in whatever the admin has changed since.
 */

let memory: StoreItem[] | null = null;

const file = () => new File(Paths.cache, 'store-items.json');

/** Synchronous so the first render can use it: the file is a few KB of JSON. */
export function cachedStoreItems(): StoreItem[] | null {
  if (memory || Platform.OS === 'web') return memory;
  try {
    const f = file();
    if (f.exists) {
      const parsed = JSON.parse(f.textSync());
      if (Array.isArray(parsed)) memory = parsed;
    }
  } catch {
    // A corrupt or unreadable cache is the same as none.
  }
  return memory;
}

/**
 * Stores a fresh answer. Returns the list to show: the previous array itself when
 * nothing changed, so the screen does not re-render (or re-preload) for nothing.
 */
export function rememberStoreItems(items: StoreItem[]): StoreItem[] {
  const previous = memory ?? cachedStoreItems();
  const json = JSON.stringify(items);
  if (previous && JSON.stringify(previous) === json) return previous;

  memory = items;
  if (Platform.OS !== 'web') {
    try {
      const f = file();
      f.create({ overwrite: true });
      f.write(json).catch(() => {});
    } catch {
      // Only costs a spinner on the next cold open.
    }
  }
  // Artwork the app has not shown yet - e.g. a frame the admin just added - is
  // fetched now, so every tab's cards appear at once.
  const known = new Set(previous?.map((i) => i.image_url));
  for (const item of items) {
    if (item.image_url && !known.has(item.image_url)) Image.prefetch(item.image_url).catch(() => {});
  }
  return items;
}
