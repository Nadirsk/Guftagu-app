// Chats & Contacts — sections 514:3077 (Chat) and 519:2450 (Contacts) of Figma
// file jSVcqffHYaDdy28xSFVaIw. Every value is the frame's own pixels; the frames
// are 402 x 874 and laid out from the very top, status bar included, except
// Report (514:3014), which Figma draws 440 wide — see REPORT.

/** The Chats | Contacts switch and the search pill (519:2937, 507:3075). */
export const TABS = {
  y: 84,
  x: 16,
  /** "Contacts" starts later when "Chats" is the big, selected one. */
  contactsX: { chats: 106, contacts: 93 },
  activeSize: 24,
  idleSize: 20,
  idleOpacity: 0.5,
  search: { x: 326, y: 84, width: 53, height: 34, radius: 32, icon: 20, iconX: 15, iconY: 6 },
} as const;

/** 507:3074 — the chat list. */
export const CHATS = {
  recommendTitle: { x: 16, y: 169, size: 18 },
  recommend: { x: 16, y: 212, item: 82, gap: 19, avatar: 69, nameGap: 5, nameSize: 15 },
  listTitle: { x: 16, y: 342, size: 15 },
  row: { x: 16, y: 391, step: 83, width: 366, avatar: 57, gap: 11, nameSize: 15, previewSize: 14, textGap: 4 },
  meta: { width: 60, timeSize: 12, gap: 5, badge: 22, badgeColor: '#EF1616', badgeSize: 12 },
  /** 504:2988 — image 205681 and "No chat list". */
  empty: { x: 111, y: 406, size: 183, labelY: 609, labelSize: 15 },
} as const;

/** 514:3172 — the four Contacts cards. */
export const CONTACTS = {
  x: 20,
  y: 158,
  width: 363,
  height: 68,
  step: 83,
  radius: 13,
  border: 'rgba(0,0,0,0.26)',
  inset: 21,
  icon: 24,
  iconGap: 6,
  labelSize: 15,
} as const;

/** 514:3268 / 514:3393 / 514:3526 / 514:3608 — a contact list, or its empty state. */
export const LIST = {
  /** Frame 1597881509: back arrow at the left, title flush with its right edge at 216. */
  header: { x: 16, y: 81, width: 200, back: 24, size: 18 },
  empty: { x: 110, y: 270, size: 183, labelSize: 15 },
  rows: { x: 16, y: 177, followingY: 161, width: 370, step: 97 },
} as const;

/** 511:2459 — a thread. */
export const THREAD = {
  header: { x: 17, y: 78, width: 200, back: 24, size: 18 },
  actions: { x: 257, y: 73, width: 53, height: 34, gap: 10, radius: 32, icon: 24, iconX: 14, iconY: 4 },
  list: { top: 150, stampTop: 24 },
  stamp: { size: 17, opacity: 0.4 },
  bubble: { padding: 8, radius: 10, size: 17, mine: '#1285FF', theirs: '#E6E6E6', side: 21, avatar: 44, avatarGap: 13, rowGap: 16 },
  /** Frame 1597881527 — canned replies, 22px above the panel. */
  quick: { x: 4, bottom: 203, height: 39, gap: 13, radius: 26, padding: 10, size: 17, border: 'rgba(0,0,0,0.12)' },
  /** Frame 1597881530 — the grey panel under the field, to the bottom edge. */
  panel: { height: 181, color: '#F6F7F8' },
  field: { x: 16, y: 20, width: 296, height: 54, radius: 47, border: 'rgba(0,0,0,0.19)', textX: 26, size: 15, smile: { x: 250, y: 14, size: 24 } },
  send: { x: 328, y: 22, size: 49 },
  tools: { x: 62, y: 90, size: 57, step: 111, color: 'rgba(217,217,217,0.42)' },
} as const;

/** 514:2763 — Chat Settings. Row ys are relative to the list at y 258. */
export const SETTINGS = {
  header: { x: 17, y: 78, width: 252, back: 24, size: 18 },
  peer: { x: 21, y: 160, width: 357, avatar: 63, gap: 14, size: 20 },
  list: { x: 21, y: 258, width: 359, size: 20 },
  toggle: { width: 50, height: 30 },
  chevron: 24,
  /** "Delete", 61px off the bottom edge. */
  delete: { bottom: 61, size: 20, color: '#EF1616' },
} as const;

/** 514:3014 / 514:3040 — Report, drawn on a 440-wide frame. */
export const REPORT = {
  width: 440,
  back: { x: 15, y: 49, size: 34 },
  title: { y: 66, size: 23 },
  label: { x: 15, width: 410, size: 17 },
  typeLabelY: 155,
  type: { y: 201, height: 63, radius: 15, textX: 23, size: 15, chevron: { x: 376, y: 22, size: 20.824 } },
  reasonLabelY: 304,
  reason: { y: 350, height: 197, textX: 18, textY: 22, size: 15 },
  uploadLabelY: 581,
  upload: { y: 624, width: 172, height: 156, radius: 7, border: 'rgba(255,255,255,0.43)', camera: 42, gap: 6, size: 16 },
  submit: { bottom: 37, height: 56, radius: 65, color: '#313131', size: 18 },
  field: '#242424',
  /** Frame 1953 / 1954 — the type picker, on the bottom edge with a 3px gap above Cancel. */
  sheet: { height: 263, radius: { left: 19, right: 20 }, itemsY: 33, step: 56, size: 19, cancel: { height: 78, gap: 3, color: '#FF7801' } },
} as const;

export const REPORT_TYPES = ['Report Nickname', 'Pornographic and Vulgar', 'Advertising harassment', 'Personal attack'] as const;
