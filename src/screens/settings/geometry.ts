/**
 * Settings section (Figma 606:3700, file x68uxiHQvFKW9HfXskPeBU). Its frames are 440
 * wide, so every number here is a pixel of that canvas, and `useSettingsUnit` turns it
 * into device points via the app's 402 design width. Delight is set in Poppins, as
 * everywhere else in the app.
 */

export const SETTINGS_SCALE = 402 / 440;

export const TEXT = '#000000';
/** Line 25 …: black at 22% inside a 50%-opacity layer. */
export const RULE = 'rgba(0,0,0,0.11)';

/**
 * Frame 1597881607: a 241-wide row from x 21, the arrow at its start and the title
 * pushed to its end — so a title's right edge is always x 262, not the page centre.
 */
export const HEADER = { back: { x: 21, y: 82, size: 34 }, title: { y: 84, right: 262, size: 20, line: 30 } } as const;

/** 601:4125 — nine rows; a rule under every one but the last. */
export const SETTINGS = {
  label: { x: 21, size: 18, line: 23, dy: 0.5 },
  chevron: { x: 405, size: 24 },
  rows: [187, 261, 335, 409, 483, 557, 631, 708, 785],
  rules: [236, 310, 384, 458, 532, 606, 683, 760],
  rule: { x: 15, width: 410 },
} as const;

/** 602:4597. */
export const ACCOUNT = {
  /** Ellipse 1998: the photo, centred half a pixel right. */
  avatar: { centerX: 220.5, y: 158, size: 89 },
  /** Ellipse 1999 (36, its white ring in a 40 box) and the 19px edit glyph on it. */
  badge: { x: 233, y: 213, size: 36, box: 40 },
  edit: { x: 241, y: 221, size: 19 },
  section: { centerX: 76.5, y: 303, size: 17, line: 22, opacity: 0.34 },
  list: { x: 15, y: 363, width: 410, size: 18, line: 23, valueOpacity: 0.3 },
  /** Each row's top (from the list's), its inset, and where its rule sits below it. */
  /** Figma's Gender row has no chevron; it got one (as Nickname's, 13 after the value) once it became editable. */
  gender: { top: 0, inset: 10.5, width: 389, chevronGap: 13 },
  nickname: { top: 68, inset: 10.5, width: 389, chevronGap: 13 },
  birthdate: { top: 136, inset: 10.5, width: 389, chevronGap: 2 },
  ruleBelow: 45,
} as const;

/** 602:4688 — five 58-tall choices, 9 apart. */
export const LANGUAGE = {
  x: 22,
  y: 168,
  width: 396,
  height: 58,
  gap: 9,
  radius: 11,
  size: 18,
  on: { background: 'rgba(0,93,233,0.15)', border: '#005DE9', text: '#1E74F4' },
  off: { background: 'rgba(0,0,0,0.09)', border: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.26)' },
} as const;

/** 602:4732 — image 205633 with "No Content here" over its last 25px. */
export const EMPTY = { centerX: 220.5, y: 309, size: 287, overlap: 25, text: { size: 20, line: 25, opacity: 0.4 } } as const;

/**
 * 602:4752 — the blocked rows. Only this frame's layout was read (its styles were not,
 * the Figma quota ran out), so the type sizes and the Unblock pill follow the app's
 * people lists until the frame is read.
 */
export const BLOCKED = {
  x: 30,
  y: 184,
  width: 381,
  step: 97,
  avatar: 66,
  /** Frame 1597881158 at (77, 10.5): the name on top, the ID 26 below the name's top. */
  text: { x: 77, nameY: 10.5, idY: 26, name: 18, nameLine: 23, id: 14, idLine: 19 },
  button: { x: 252, y: 8.5, width: 129, height: 49, size: 16, line: 20 },
} as const;

/** 602:4907 — description box, Upload Image, Contact Information, Submit. Styles pending. */
export const FEEDBACK = {
  x: 27,
  box: { y: 154, width: 387, height: 261, padX: 24, padY: 40, size: 14, line: 16 },
  upload: { labelY: 440, boxY: 469, width: 164, height: 116, camera: 56, size: 14, line: 16 },
  contact: { labelY: 616, fieldY: 643, width: 397, height: 43, padX: 14, size: 14, line: 19 },
  submit: { y: 853, width: 397, height: 51, size: 16, line: 20 },
  label: { size: 14, line: 16 },
  field: 'rgba(0,0,0,0.05)',
  radius: 11,
} as const;
