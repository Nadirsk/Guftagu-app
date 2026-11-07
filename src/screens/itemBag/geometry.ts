/**
 * Item Bag (Figma 2015:9442), on the usual 402-wide canvas. Every number is a design
 * pixel, scaled by `px`.
 */

export const PAGE = {
  /** Behind the art, where it does not reach. */
  background: '#3A0202',
  /** image 205666: 503 × 920 from the top, centred (half a pixel right). */
  art: { width: 503, height: 920, left: (402 - 503) / 2 + 0.5 },
  back: { x: 21, y: 70, size: 34 },
  title: { y: 73, size: 21, line: 29 },
} as const;

/** The two card styles share their size, border, corner and glow. */
const CARD = {
  height: 124,
  radius: 9,
  /**
   * The stroke is #FFFEFE fading along the card's diagonal — `get_design_context` flattens
   * it to solid, so these stops are measured from the frame's render: alpha at each
   * point (u + v) / 2 of the card, top-left 0 → bottom-right 1.
   */
  border: {
    color: '#FFFEFE',
    stops: [
      [0, 1],
      [0.17, 1],
      [0.3, 0.8],
      [0.4, 0.64],
      [0.6, 0.35],
      [0.7, 0.23],
      [0.8, 0.12],
      [0.9, 0.04],
      [1, 0],
    ] as const,
  },
  /** Ellipse 1983 (white) at (−48, −52), Ellipse 1984 (cyan) at (−24, −47); each 76 wide, its blur box 137.4. */
  glows: { white: { x: -48, y: -52 }, cyan: { x: -24, y: -47 }, size: 76, box: 137.4 },
} as const;

/**
 * The category cards. Figma draws Frame, Entry Effect, Bubbles across and Entry Banner
 * under Frame; the other four types carry on in the same three columns, 138 apart.
 */
export const SLOTS = {
  ...CARD,
  width: 114,
  background: '#080719',
  grid: { xs: [29, 152, 275], y: 151, rowStep: 138 },
  /** Figma's labels are 12; the longer ones added since (Room Background) drop to 11 to fit the card. */
  label: { size: 12, line: 15, longSize: 11, longFrom: 15 },
  /** Owning something of this type: the label 14 from the top, the art (image 12) under it, centred 8 below the middle. */
  worn: { labelTop: 14, image: { width: 57, height: 52, dx: -0.5, dy: 8 } },
  /** Owning none of this type: label, 18 gap, then the 54px inbox icon, the pair centred. */
  empty: { gap: 18, icon: 54, dy: 0.5 },
} as const;

/** An owned item's card, in the sheet (Figma drew the same card under "All Items"). */
export const ITEMS = {
  ...CARD,
  width: 106,
  background: 'rgba(3,8,10,0.82)',
  /** "1544 days remaining" (45%), 10 gap, image 12 — a 66-wide column centred 3 above the middle. */
  stack: { width: 66, gap: 10, dy: -3, size: 11, line: 14, opacity: 0.45 },
  image: { width: 57, height: 52 },
  check: { x: 81, y: 99, size: 17 },
} as const;

/**
 * 2015:9551 / 2015:9611 — tapping a slot: the page dims a little and a 480-tall sheet
 * rises from the bottom with that slot's items and one wide button, Unequip when the
 * picked item is on and Equip when it is not. The sheet is 436 wide, 1 left of centre.
 */
export const SHEET = {
  /** Rectangle over the whole page. */
  scrim: 'rgba(0,0,0,0.19)',
  width: 436,
  height: 480,
  left: (402 - 436) / 2 - 1,
  background: '#FFFFFF',
  /** image 205668: 478 × 853, 11 left of the sheet's centre, from 151 above its top. */
  art: { width: 478, height: 853, left: (436 - 478) / 2 - 11, top: -151 },
  title: { top: 32, size: 18, line: 23, dx: 0.5 },
  /** The item cards: centres 119 apart about the sheet's middle, three to a row. */
  cards: { top: 81, colStep: 119, rowStep: 138 },
  button: { top: 388, width: 354, height: 53, radius: 13, size: 16, line: 21, background: '#FFFFFF', color: '#000000' },
} as const;

/**
 * Not in Figma: the sheet outlines the item you wear in the glow's cyan (with its
 * check), and the one you tapped in white, so it is clear what the button acts on.
 */
export const HIGHLIGHT = { worn: '#48BBC7', picked: '#FFFFFF', width: 2 } as const;
