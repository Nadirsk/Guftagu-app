// Design pixels for the home feed's three tabs, all drawn on the same 402x874
// Figma frame in file 2efyYqMzjutSW7aq0vSf7L:
//
//   Following → node 32:740
//   Party     → node 15:64
//   Live      → node 49:819
//
// Section positions are absolute on the frame; child positions are relative to
// their section, the way Figma nests them. Everything is scaled with `px()` from
// `theme/layout`, so the result is proportional on any device width.
//
// The three frames disagree by 1-4px on the shared sections' left margins and on
// the card grid's gaps. Those look like drawing slips rather than three different
// specs, but each tab is reproduced on its own frame's numbers, so `TABS` below
// carries a per-tab x/gap for every shared section. The one value NOT taken
// literally is Following's fourth card, which Figma leaves 1px left of and 4px
// above its own row — there is no way to read that as intentional.

/** The white header band (node 52:1269) that the feed scrolls under. */
export const HEADER = {
  height: 118,
  tabs: { x: 16, y: 84, gap: 10 },
  tab: {
    activeSize: 24,
    activeHeight: 29,
    inactiveSize: 20,
    inactiveHeight: 27,
  },
  search: { x: 333, y: 76, width: 53, height: 34, radius: 32, icon: 20 }, // node 15:453
} as const;

/** Countries section — node 19:340 (Party) / 50:1164 (Live). */
export const COUNTRIES = {
  headerWidth: 370, // node 19:339
  headerHeight: 22,
  rowHeight: 34,
  gap: 14,
  chipGap: 8,
  all: { width: 80, height: 34, radius: 39 },
} as const;

/** Story strip — node 25:371 (Party) / 50:1192 (Live). */
export const STORIES = {
  gap: 18,
  circle: { width: 55, height: 54 },
  /** The "Create" cell is narrower than its ring, so the ring overhangs by 4px. */
  createWidth: 47,
  labelGap: 5,
  plus: 24,
} as const;

/** Live-card grid — node 19:337 (Party) / 49:911 (Live) / four loose cards on Following. */
export const GRID = {
  card: { width: 180, height: 192 },
  /** node 19:228 — flag + title over the overlapping viewer avatars. */
  info: { x: 12, y: 125, width: 83, gap: 4 },
  titleRow: { height: 23, flagTop: 5, titleX: 24, titleTop: 2 },
  avatars: { size: 29, step: 12, count: 5 },
  /** node 19:231 — translucent viewer-count tab; overhangs the card by ~1px. */
  badge: { x: 130, y: 16, width: 51.133, height: 34 },
  badgeWave: { x: 6, y: 9, size: 17 },
  badgeCount: { x: 31, y: 7, width: 15, height: 21 },
} as const;

/** Where each tab's sections start, and how tall its content is. */
export const TABS = {
  Following: {
    // Nodes 32:743 / 43:309 / 43:336 — x=16, columns 13 apart, rows 19 apart.
    grid: { x: 16, y: 164, columnGap: 13, rowGap: 19 },
    canvas: 567, // last card bottom (164 + 192 + 19 + 192)
  },
  Party: {
    banners: {
      left: { x: 16, y: 155 }, // node 19:63
      right: { x: 208, y: 154 }, // node 19:346
      wide: { x: 16, y: 247 }, // node 19:343 — artwork starts 19px in, see banners.tsx
    },
    countries: { x: 16, y: 408 }, // node 19:340
    stories: { x: 20, y: 509 }, // node 25:371
    grid: { x: 14, y: 624, columnGap: 12, rowGap: 16 }, // node 19:337
    canvas: 1024,
  },
  Live: {
    hero: { x: 16, y: 146, width: 370, height: 367, radius: 10 }, // node 50:1091
    countries: { x: 13, y: 545 }, // node 50:1164
    stories: { x: 17, y: 646 }, // node 50:1192
    grid: { x: 14, y: 755, columnGap: 12, rowGap: 16 }, // node 49:911
    canvas: 1155,
  },
} as const;

/**
 * Bottom navigation — node 15:307. Figma leaves this group loose on the canvas
 * rather than inside any 402x874 frame, so its 348x52 content block is reproduced
 * exactly and the padding around it is chosen here.
 *
 * `icon`/`overlay` are the two stacked vectors each item is drawn from (the house
 * plus its doorway, the square plus its arc); `label` is the text box. All are
 * relative to the 348-wide content block.
 */
export const BOTTOM_NAV = {
  content: { x: 26, width: 348, height: 52 },
  paddingTop: 8,
  paddingBottom: 8,
  label: { top: 34, height: 18, fontSize: 12 },
  /**
   * Each item is laid out around `center` — the x its icon and label share in
   * Figma — rather than from Figma's own label boxes. Those boxes (36 / 50 / 30 /
   * 18 wide) are measured in Delight, and Poppins is wider, so "Home" wrapped
   * onto a second line inside a 36px box. Centring on a fixed cell keeps the
   * positions Figma specifies and lets every label stay on one line.
   */
  cellWidth: 72,
  items: [
    {
      key: 'Home',
      center: 18,
      icon: { x: 3, y: 0, width: 29.39, height: 29.39 },
      overlay: { x: 11.766, y: 13.188, width: 11.343, height: 12.888 },
    },
    {
      key: 'Moment',
      center: 123,
      // 28x28 slot in Figma, but the 30-unit viewBox overhangs it by 1 on each side.
      icon: { x: 109, y: -1, width: 30, height: 30 },
      overlay: { x: 119, y: 10, width: 10, height: 10 },
    },
    {
      key: 'Chat',
      center: 228,
      icon: { x: 213, y: 0, width: 29, height: 29 },
    },
    {
      key: 'Me',
      center: 333,
      icon: { x: 319, y: 0, width: 29, height: 29 },
    },
  ],
} as const;

/** Hero card internals, relative to node 50:1091's 370x367 box. */
export const HERO = {
  /** node 50:1238 — the scrim that darkens the lower half. */
  scrim: { x: -5, y: 77, width: 381, height: 301 },
  scrimStops: [0.14768, 0.51152] as const,
  dots: { x: 158, y: 336, width: 53, height: 11 }, // node 52:1244
  streamer: { x: 18, y: 270, gap: 10, avatar: 49, innerGap: 7, fontSize: 16 }, // node 52:1257
  badge: { x: 300, y: 32, width: 71.132, height: 38.089 }, // node 52:1259
  badgeWave: { x: 8.5, y: 7.49, width: 27, height: 23 }, // node 52:1262
  badgeCount: { x: 41, y: 7, width: 20.574, height: 22.853, fontSize: 15 }, // node 52:1261
} as const;

export const FONT_SIZE = {
  sectionTitle: 21, // "Countries"
  sectionAction: 14, // "More"
  chip: 12, // country chip labels
  filter: 14, // "All"
  storyLabel: 14,
  ribbon: 10, // "Weekly Star" / "CP Ranking"
  cardTitle: 12, // "Riya's Live"
  viewers: 14, // the small cards' "14"
} as const;

/** Horizontal page margin shared by every section. */
export const SCREEN_PADDING = 16;
