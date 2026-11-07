// Weekly Star — section 587:5950: 587:5566 is the Ranking tab, 587:5808 the
// Reward tab, 587:5686 the Rules popup. Every value is the frame's own pixels.
//
// Figma draws the shared top half (hero, countdown, tab row) 4-14px apart in the
// two tab frames, and the Reward cards 2px left of the Event Gifts card. Copied
// verbatim, the tabs jump when switching, so both tabs use the Ranking frame's
// top half and the Reward cards are shifted onto the Event Gifts card's line.

import type { Box, Crop } from '../../components/figmaLayers';

export type { Box, Crop };

export type TabKey = 'ranking' | 'reward';

/** Offset applied to every Reward card so it lines up with Event Gifts. */
const REWARD_SHIFT = { x: 2, y: 3 };

/** Scrollable height per tab — the Reward frame plus the shift above. */
export const FRAME_HEIGHT: Record<TabKey, number> = {
  ranking: 2519,
  reward: 2327 + REWARD_SHIFT.y,
};

/** The shared top half, from the Ranking frame (587:5566). */
export const TOP = {
  hero: { x: 0, y: 0, w: 407, h: 824 },
  countdownBg: { x: 17, y: 581, w: 370, h: 171 },
  /** Left edge and top of Frame 9014, the four countdown cells. */
  countdownRow: { x: 65, y: 657 },
  tabs: { x: 9, y: 770, w: 377 },
};

/** Tab labels sit centred on their plate (Figma's x of 60/62 is that centre). */
export const TAB_LABEL = {
  y: 29,
  active: '#071394',
  // Each frame greys its idle tab differently.
  idle: { ranking: '#494949', reward: 'rgba(0,0,0,0.35)' } as Record<TabKey, string>,
};

/** Frame 9023 — the "Rules" pill, cropped out of a larger bitmap. */
export const RULES_BUTTON = {
  box: { x: 306, y: 256, w: 137, h: 43 },
  crop: { w: 163.91, h: 395.35, l: -33.05, t: -139.53 },
  labelCenterX: 64,
  labelY: 11,
};

export const TAB = { w: 187, h: 75 };

/** Paints top-to-bottom: #181A93 fading to black at 55.289% of the frame. */
export const BACKDROP = { from: '#181A93', to: '#000000', stop: 0.55289 };

// ---- the ornate card (Event Gifts, Top 1-3) ----------------------------------

/** image 205697/205698 — a gold side bar cut out of the card-frame sprite. */
export const SIDE_CROP: Crop = { w: 551.99, h: 124.96, l: -317.99, t: -14.26 };
/** image 205696 — the jewelled bottom edge, from the same sprite. */
export const BOTTOM_CROP: Crop = { w: 194.71, h: 623.73, l: -47.88, t: -470.34 };
/** bg_vip5_item 2 on the reward cards, which are taller than the bitmap's ratio. */
export const CARD_BG_CROP: Crop = { w: 100, h: 129.33, l: 0, t: -28.2 };

export type CardSpec = {
  bg: Box;
  bgCrop?: Crop;
  /** Rotated 180° — the sprite only has a right-hand bar. */
  left: Box;
  right: Box;
  bottom: Box;
  /** Top 1's jewelled edge is the last layer in its frame, over the item labels. */
  bottomOnTop?: boolean;
  ribbon: Box;
  /** Centre of the first item row and its top. */
  row: { cx: number; y: number };
  /** Items four onward wrap onto a second, slightly wider-spaced row. */
  row2?: { cx: number; y: number };
};

export const RIBBON = { labelDy: 38, labelSize: 15, labelHeight: 23 };

export const ITEM = {
  w: 69,
  tile: 68.77, // 297/296 bitmap at 69 wide
  labelGap: 9,
  labelSize: 12,
  labelHeight: 18,
  gap: 28,
  gap2: 30,
};

/** Group 1597880990 — "Event Gifts" on the Ranking tab. */
export const EVENT_GIFTS: CardSpec = {
  bg: { x: 15, y: 916, w: 370, h: 272 },
  left: { x: 4, y: 890, w: 84, h: 306 },
  right: { x: 312, y: 899, w: 84, h: 306 },
  bottom: { x: 1.5, y: 1115, w: 396, h: 124 },
  ribbon: { x: 68, y: 872, w: 265, h: 91 },
  row: { cx: 199.5, y: 1002 },
};

/** Top 1 / Top 2 / Top 3 on the Reward tab — Figma nudges each one differently. */
const FIGMA_REWARD_CARDS: CardSpec[] = [
  {
    bg: { x: 13, y: 913, w: 370, h: 373 },
    bgCrop: CARD_BG_CROP,
    left: { x: 5, y: 885, w: 83, h: 419 },
    right: { x: 310, y: 892, w: 83, h: 419 },
    bottom: { x: 1, y: 1208, w: 396, h: 124 },
    bottomOnTop: true,
    ribbon: { x: 66, y: 869, w: 265, h: 91 },
    row: { cx: 197.5, y: 999 },
    row2: { cx: 199, y: 1119 },
  },
  {
    bg: { x: 13, y: 1380, w: 370, h: 373 },
    bgCrop: CARD_BG_CROP,
    left: { x: 5, y: 1347, w: 83, h: 419 },
    right: { x: 310, y: 1355, w: 83, h: 419 },
    bottom: { x: 6, y: 1673, w: 396, h: 124 },
    ribbon: { x: 66, y: 1336, w: 265, h: 91 },
    row: { cx: 197.5, y: 1466 },
    row2: { cx: 199, y: 1586 },
  },
  {
    bg: { x: 13, y: 1847, w: 370, h: 373 },
    bgCrop: CARD_BG_CROP,
    left: { x: 0, y: 1819, w: 83, h: 419 },
    right: { x: 310, y: 1822, w: 83, h: 419 },
    bottom: { x: 0, y: 2131, w: 396, h: 124 },
    ribbon: { x: 66, y: 1803, w: 265, h: 91 },
    row: { cx: 197.5, y: 1933 },
    row2: { cx: 199, y: 2053 },
  },
];

export function shiftCard(c: CardSpec, dx: number, dy: number): CardSpec {
  const box = (b: Box) => ({ ...b, x: b.x + dx, y: b.y + dy });
  const row = (r: { cx: number; y: number }) => ({ cx: r.cx + dx, y: r.y + dy });
  return {
    ...c,
    bg: box(c.bg),
    left: box(c.left),
    right: box(c.right),
    bottom: box(c.bottom),
    ribbon: box(c.ribbon),
    row: row(c.row),
    row2: c.row2 && row(c.row2),
  };
}

export const REWARD_CARDS = FIGMA_REWARD_CARDS.map((c) => shiftCard(c, REWARD_SHIFT.x, REWARD_SHIFT.y));

/** A fourth band or more (none in Figma) keeps Top 3's spacing. */
export const REWARD_CARD_STEP = 467;

/** Where a reward's icon sits on its 69px tile, by reward kind. */
export const REWARD_ICON: Record<string, Box & { crop?: Crop }> = {
  entry_effect: { x: 13, y: 13, w: 42, h: 42 },
  frame: { x: 12, y: 11, w: 48, h: 47 },
  badge: { x: 8, y: 13, w: 53, h: 44 },
  coins: { x: 12, y: 20, w: 45, h: 30, crop: { w: 91.05, h: 100, l: 4.72, t: 0 } },
  // Not in the Weekly Star frame — Daily Rewards' diamond pile (204x101), centred where the coins sit.
  diamonds: { x: 9, y: 22, w: 52, h: 26 },
};
/** An admin-uploaded catalog icon has no Figma slot; centre it on the tile. */
export const CUSTOM_ICON: Box = { x: 12, y: 12, w: 45, h: 45 };

// ---- Activity Ranking (Group 1597881040) -------------------------------------

export const RANKING = {
  /** image 205656 / 205658 — the tall red-and-gold side rails. */
  railCrop: { w: 1271.31, h: 134.98, l: -30.51, t: -10.35 } as Crop,
  railLeft: { x: 9, y: 1267, w: 37, h: 1181 },
  railRight: { x: 353, y: 1259, w: 37, h: 1189 },
  ribbon: { x: 68, y: 1277, w: 265, h: 91 },
  footer: { x: 13, y: 2408, w: 368, h: 91 },
  footerCrop: { w: 106.92, h: 242.09, l: -3.14, t: -105.22 } as Crop,

  first: {
    avatar: { x: 148, y: 1422, w: 100, h: 97 },
    frame: { x: 107, y: 1396, w: 184, h: 153 },
    frameCrop: { w: 100, h: 149.91, l: 0, t: -6.9 } as Crop,
    nameCenterX: 199,
    nameY: 1554,
    nameSize: 19,
    nameHeight: 29,
    pill: { x: 151, y: 1579 },
    pillLabelCenterX: 46.5,
  },
  // Frame 1597881237: its avatar is drawn over the frame, unlike Top 1 and 3.
  second: {
    at: { x: 44, y: 1606 },
    frame: { x: 0, y: 13, w: 142, h: 127 },
    frameCrop: { w: 100.12, h: 139.38, l: -0.06, t: 0 } as Crop,
    avatar: { x: 32, y: 38, w: 79, h: 80 },
    nameCenterX: 69.5,
    nameY: 146,
    // Frame 1597880993 (587:5683) sits outside the group, on the frame itself.
    pill: { x: 65, y: 1779 },
    pillLabelCenterX: 46,
  },
  // Frame 1597881239 — avatar under the frame, pill inside the group.
  third: {
    at: { x: 186, y: 1623 },
    inner: { x: 7, y: 0 },
    avatar: { x: 40, y: 30, w: 83, h: 81 },
    frame: { x: 10, y: 5, w: 142, h: 127 },
    frameCrop: { w: 100, h: 150.93, l: 0, t: -5.09 } as Crop,
    nameCenterX: 85.5,
    nameY: 135,
    pill: { x: 42, y: 161 },
    pillLabelCenterX: 46.5,
  },
  podiumNameSize: 17,
  podiumNameHeight: 26,
  pill: { w: 92, h: 31, labelY: 10, labelSize: 9, labelHeight: 14 },

  // Frame 1597880997 … 1597881003 — ranks 4 to 10.
  rows: {
    x: 48,
    y: 1883,
    step: 79,
    w: 298,
    h: 68,
    radius: 9,
    border: 2,
    fill: '#181A93',
    stroke: '#0051FF',
    // Inside the 2px border, as Figma's absolute children are.
    rankCenterX: 20.5,
    rankY: 20,
    avatar: { x: 35, y: 16, w: 33, h: 33 },
    nameX: 78,
    nameW: 115,
    nameY: 22,
    scoreX: 199,
    scoreY: 21,
    coin: { x: 253, y: 20, w: 25, h: 25 },
  },
};

// ---- Rules popup (587:5686) ---------------------------------------------------

// Group 1597880995 — panel, "Activity Rules" title and the close disc come in as
// one export; only the close disc's hit area and the rule text are live.
export const RULES_POPUP = {
  scrim: 'rgba(0,0,0,0.44)', // Rectangle 161124108
  art: { x: 14, y: 223, w: 374, h: 431 },
  close: { x: 341, y: 223, w: 47, h: 47 },
  text: { x: 34, y: 420, w: 334, size: 19, lineHeight: 29, color: '#FEB20F' },
  fallback:
    'In this activity only weekly star gift will be counted and weekly reward will be sent from top 1 to top 3',
};
