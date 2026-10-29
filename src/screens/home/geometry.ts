// Design pixels for the dark home — section 483:3248 in file ODEXeeT7yuiT9r7AG4Q3Gh,
// four tabs on 402-wide frames that share one header:
//
//   For You   → node 472:2311 (named "Following" in Figma, but For You is the
//               selected tab and its cards carry a Follow link)
//   Following → node 479:2606 (the same cards without Follow)
//   Family    → node 479:2363
//   Live      → node 463:2002
//   Daily Rewards popup and the bottom bar → node 483:2812
//
// Positions are absolute on the frame unless a block says otherwise. Everything
// is scaled with `px()` from `theme/layout`, so the result is proportional on any
// device width.
//
// The frames disagree by a few pixels on the shared header (the bell sits at
// 329,39 / 333,42 / 333,43 / 333,47) and on the tab row (618 vs 611). Those read
// as drawing slips, so the header and tabs follow the plain "home page" frame
// (479:2606) on every tab.

/** The shared header, drawn over `background`. */
export const HEADER = {
  /** image 205674 — 250x1024 bitmap stretched to 402x1357 over the black frame. */
  background: { width: 402, height: 1357 },
  title: { x: 16, y: 76, size: 21 }, // "Guftagu"
  /** Frames 1597881452-4 — a 51px portrait with a 12px name 5px under it. */
  avatar: { size: 51, labelTop: 56, labelSize: 12, labelHeight: 15 },
  avatars: [
    { x: 171, y: 40 }, // 479:2615
    { x: 315, y: 121 }, // 479:2612
    { x: 73, y: 177 }, // 479:2618 — mostly behind the matching pill
  ],
  /** Group 1597881079 (483:3227). */
  bell: {
    /** Ellipse 1990 is 53px; its blur export overhangs by 29.43% on each side. */
    glow: { x: 317.4, y: 27.4, size: 84.2 },
    box: { x: 339, y: 50 },
    /** image 205676 — a 34x39 window onto the bell bitmap, cropped by Figma. */
    image: { width: 34, height: 39, x: -11.333, y: -7.548, scaledWidth: 56.667, scaledHeight: 56.613 },
    badge: { x: 24, y: 0, size: 18, fontSize: 12 },
  },
  /**
   * Frame 1597881448 — the "Matching with you" pill, hanging 32px off the left
   * edge. Child positions are relative to the pill.
   */
  match: {
    x: -32,
    y: 201,
    width: 210,
    height: 56,
    radius: 28,
    avatar: { x: 42, y: 7, size: 39 },
    count: { x: 106, y: 7, size: 16, height: 20 },
    /**
     * Figma sets this in Delight; Poppins at the same size runs 15px longer and
     * into the chevron, so it is tracked in just enough to clear it.
     */
    caption: { x: 88, y: 29, size: 11, height: 14, tracking: -0.5 },
    /** Four 3px bars, bottom-aligned, 1px apart. */
    bars: { x: 87, y: 11, width: 3, gap: 1, heights: [13, 9, 12, 5] },
    chevron: { x: 182, y: 24, size: 19, glyph: { x: 6.333, y: 4.75, width: 5.858, height: 9.5 } },
  },
  activeNow: { y: 303, gap: 7, size: 16, height: 20 }, // Frame 1597881450, centred
} as const;

/** Ranking banners — the artwork's top-left on the frame (see banners.tsx). */
export const BANNERS = {
  left: { x: 16, y: 357 }, // Group 8921
  right: { x: 208, y: 357 }, // Group 8922 — its ribbon starts 18px higher, at 339
  wide: { x: 14, y: 465 }, // Group 8923 — its ribbon starts 19px higher, at 446
} as const;

export const FONT_SIZE = {
  ribbon: 10, // "Weekly Star" / "CP Ranking"
} as const;

/** Frame 1597881478 — For You / Following / Family / Live. */
export const TABS = {
  x: 17,
  y: 618,
  gap: 22,
  active: { size: 20, height: 25 },
  idle: { size: 18, height: 23, opacity: 0.8 },
  /** Rectangle 161124120 — under the selected label's left edge. */
  underline: { y: 27, width: 45, height: 3, radius: 11 },
} as const;

/** Frame 1597881455 — one feed card. Children are relative to the card. */
export const POST = {
  x: 17,
  y: 672,
  width: 369,
  gap: 20, // 672 + 378 → 1070
  radius: 10,
  paddingTop: 25,
  paddingBottom: 19,
  author: { x: 19, avatar: 54, gap: 11, nameSize: 18, nameHeight: 23 },
  /** Ellipse 1991 + "Follow" — straight after the name. */
  follow: { gap: 6, dot: 4, dotGap: 4, size: 16, height: 20 },
  /** Frame 1597881457 — right-aligned, 16px in from the card edge. */
  chat: { right: 16, top: 41.5, icon: 21, gap: 7, size: 15, height: 19 },
  /** One attachment is Figma's frame; several are a 3-across grid of squares. */
  media: { x: 25, gap: 22, width: 247, height: 213, radius: 13, columns: 3, gridGap: 8, tileRadius: 8 },
  body: { x: 25, gap: 22, size: 15, height: 21 },
  footer: { x: 25, gap: 21, width: 316, height: 24, dateSize: 15, dateHeight: 19 },
  actions: { gap: 17, icon: 24, countGap: 5, countSize: 13, countHeight: 16 },
} as const;

/** The Live tab's single card (Frame 1597881186). */
export const LIVE_CARD = { x: 16, y: 674, width: 370, height: 367, radius: 10 } as const;

/** Hero card internals, relative to the Live card's 370x367 box. */
export const HERO = {
  /** node 483:2740 — the scrim that darkens the lower half. */
  scrim: { x: -5, y: 77, width: 381, height: 301 },
  scrimStops: [0.14768, 0.51152] as const,
  dots: { x: 158, y: 336, width: 53, height: 11 }, // node 483:2741
  streamer: { x: 18, y: 270, gap: 10, avatar: 49, innerGap: 7, fontSize: 16 }, // node 483:2746
  badge: { x: 300, y: 32, width: 70.132, height: 37 }, // node 483:2752
  badgeWave: { x: 8.5, y: 7.49, width: 27, height: 23 }, // node 483:2755
  badgeCount: { x: 41, y: 7, width: 20.574, height: 22.853, fontSize: 15 }, // node 483:2754
} as const;

/** Family tab (479:2363) — the empty state and one suggested family. */
export const FAMILY = {
  empty: { y: 812, size: 15, height: 19 },
  suggestTitle: { y: 921, size: 17, height: 21 },
  row: {
    x: 16,
    y: 997,
    width: 370,
    cover: { width: 86, height: 84, radius: 9 },
    info: { width: 273, height: 62 },
    name: { width: 92, size: 16, height: 20, gap: 12 },
    /** green-heart-icon 1 — aspect 73:16 at 92 wide, the bitmap inset inside it. */
    badges: { width: 92, height: 20.164, imageX: 0.598, imageWidth: 86.692 },
    members: { width: 73, icon: 21, gap: 5, size: 15, height: 18, opacity: 0.5, stackGap: 6 },
    join: { width: 73, height: 35, radius: 23, size: 15 },
  },
  canvas: 1081,
} as const;

/**
 * Daily Rewards (Group 1597881078) — centred on the screen 21px above middle,
 * the card 67px under the top of the ribbon that crowns it.
 */
export const REWARDS = {
  width: 353,
  height: 488,
  centerOffset: -21,
  /** download (1) 2 — a 256.7x109 window onto the ribbon bitmap. */
  ribbon: {
    x: 53.131,
    y: 0,
    width: 256.739,
    height: 109,
    image: { x: -11.4, y: -80.9, width: 279.537, height: 279.537 },
  },
  /** "Daily Rewards" — 9.5px right of the group's centre line, as drawn. */
  title: { y: 40, size: 14, height: 21, centerOffset: 9.5 },
  /**
   * Frame 1597881083 — 353x421 with a 5px stroke that fades from white at the top
   * to #FF8B25 at the bottom. Children below are relative to the inside of that
   * stroke (343x411), the way the stroke clips them.
   */
  card: { y: 67, width: 353, height: 421, radius: 19, stroke: 5 },
  /** Frame 1597881098 — the yellow wash; the subtitle is centred inside it. */
  wash: { x: 0, y: -12, width: 342, height: 105 },
  subtitle: { y: 69, size: 14, height: 21 },
  grid: { y: 101, rowGap: 15, columnGap: 11, width: 307 },
  /** One reward. Children are relative to the inside of its 1px border. */
  tile: {
    width: 95,
    height: 91,
    radius: 6,
    border: 1,
    coins: { x: 22, y: 19, width: 50, height: 35, imageX: 0.98, imageWidth: 47.04 },
    band: { x: -1, y: 63, width: 95, height: 28 },
    label: { y: 68, size: 11, height: 17, coin: 13, gap: 2 },
  },
  collect: { y: 330, width: 313, height: 53, radius: 37, size: 16, lineHeight: 24 },
} as const;

/**
 * The bottom bar — Frame 1597881477 (687:6679). 406 wide and hung 2px past each
 * side, so its 1px border only shows along the top. Figma lets it run 26px past
 * the bottom of the frame; on a device that space is the home-indicator inset.
 */
export const BOTTOM_NAV = {
  x: -2,
  width: 406,
  radius: 15,
  /** Where the items start under the top border. */
  itemsTop: 23,
  item: { width: 39, height: 44, icon: 24, labelTop: 26, labelSize: 14, labelHeight: 18 },
  /** Visible height on the 874px frame (874 - 782). */
  height: 92,
  idleOpacity: 0.5,
  items: [
    { key: 'Home', x: 37 },
    { key: 'Party', x: 129 },
    { key: 'Chats', x: 236 },
    { key: 'Mine', x: 332 },
  ],
} as const;
