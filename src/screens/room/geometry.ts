/**
 * The voice room — section 66:544 of Figma file 5tXLIf98AkO8fPRVOQRDc0, frame
 * 34:2257 and the overlays drawn on its copies. Every number is a design pixel
 * on the 402x874 frame; Figma writes x as `calc(N% + Mpx)`, resolved here
 * against 402.
 *
 * The header, the seats and the notice hang from the top of the screen. The
 * chat, the side buttons and the input row hang from the bottom — their y is
 * stored as Figma has it and shifted by however much taller the phone is than
 * the frame (`extra` in RoomScreen).
 */

export const FRAME = { width: 402, height: 874 } as const;

/** 34:2257's fill, under the 50%-opacity cover photo (34:2258). */
export const BACKDROP = {
  colors: ['rgba(11,10,10,0.9)', 'rgba(34,6,30,0.9)', 'rgba(2,5,12,0.9)'] as const,
  locations: [0.0042649, 0.50201, 0.90804] as const,
  photo: { x: -14, y: -2, width: 416, height: 881, opacity: 0.5 },
} as const;

/** Group 8871 — the owner pill, and the follow heart inside it (34:2271). */
export const OWNER = {
  pill: { x: 16, y: 39, width: 128, height: 40 },
  avatar: { x: 20.5, y: 44, size: 30 },
  text: { x: 55, y: 46, width: 54, gap: 1 },
  name: { size: 12, height: 14 },
  id: { size: 8.5, height: 10 },
  heart: { x: 112, y: 46.6, width: 28, height: 24.7 },
} as const;

/** Frame 38:267 — share (transfer) then power, 11 apart, centred on one row. */
export const TOP_ACTIONS = {
  x: 314,
  y: 76,
  gap: 11,
  share: { width: 20, height: 19 },
  power: 29,
} as const;

/** 3D Switch (34:2338) holding the trophy and the room's diamonds (38:265). */
export const TROPHY = {
  pill: { x: 16, y: 88.5, width: 86, height: 25, opacity: 0.6 },
  row: { x: 27, y: 144, gap: 5 },
  icon: { width: 16, height: 18 },
  text: { size: 14 },
} as const;

/** Frame 1597881171 — a 70x32 pill: the newest face, then how many are inside. */
export const VIEWERS = {
  x: 305,
  y: 137,
  width: 70,
  height: 32,
  radius: 18,
  avatar: { x: 9, y: 5, size: 21 },
  count: { centerX: 44, y: 7, size: 14 },
} as const;

/**
 * One seat: Ellipse 57 (47.053 round) with the Seat instance inset 8.4 inside
 * it, the glyph masked at (3, 2) 18x20 within that. The ring's exported SVG
 * carries its drop shadow, so it is larger than the ring and starts up-left of
 * it — `ringSvg`/`vipRingSvg` are that offset and size.
 */
export const SEAT = {
  ring: 47.053,
  ringSvg: { dx: -5, dy: -1, size: 57.0534 },
  vipRingSvg: { dx: -4, dy: 0, size: 55.0534 },
  inner: { inset: 8.4, size: 30.249 },
  glyph: { dx: 3, dy: 2, width: 18, height: 20 },
  label: { size: 16, width: 40.552, height: 16.496 },
  /** Grid columns (Group 8858) and the gap between rows (297 → 388.22). */
  columns: [30, 128, 226, 324] as const,
  rowStep: 91.22,
} as const;

/** `ring` is the seat's diameter; everything inside it scales from Figma's 47.053. */
export type SeatSpot = { x: number; y: number; labelX: number; labelY: number; ring: number; labelSize: number };

/** Figma's own ten seats — two on top (Group 8869), then two rows of four. */
const TEN: [number, number, number, number][] = [
  [129, 207, 149.28, 255.8],
  [226, 207, 246.28, 255.8],
  [30, 297, 53.03, 346.49],
  [128, 297, 151.28, 346.49],
  [226, 297, 249.28, 346.49],
  [324, 297, 347.28, 346.49],
  [30, 388.22, 53.28, 441],
  [128, 388.22, 151.28, 441],
  [226, 388.22, 249.28, 441],
  [324, 388, 347.28, 441],
];

/** The block the seats may fill: Figma's columns span 30 → 371, rows 207 → the notice. */
const AREA = { left: 30, right: 371, top: 207, bottom: 470 } as const;

/**
 * Where each of `count` seats sits — the Mic Mode a room was created with
 * (Create Room offers 2, 12, 20 and 40). Ten is the frame verbatim and two is its
 * top pair; up to ten keeps that system (rows of four, the remainder centred on
 * a short row above). Twelve is three rows of four at full size. Twenty and
 * forty would not fit at full size, so they shrink the seat to fit five or eight
 * across inside the same block, as Create Room's own previews do.
 */
export function seatSpots(count: number): SeatSpot[] {
  const full = (x: number, y: number, labelX: number, labelY: number): SeatSpot => ({
    x, y, labelX, labelY, ring: SEAT.ring, labelSize: SEAT.label.size,
  });
  if (count === 10) return TEN.map(([x, y, lx, ly]) => full(x, y, lx, ly));
  if (count === 2) return TEN.slice(0, 2).map(([x, y, lx, ly]) => full(x, y, lx, ly));

  if (count <= 12) {
    const spots: SeatSpot[] = [];
    const top = count === 12 ? 0 : count % 4;
    const topRow: Record<number, number[]> = { 1: [177], 2: [129, 226], 3: [79, 177, 275] };
    let y = 207;
    if (top > 0) {
      for (const x of topRow[top]) spots.push(full(x, y, x + 20.28, y + 48.8));
      y = 297;
    }
    while (spots.length < count) {
      for (const x of SEAT.columns) {
        if (spots.length === count) break;
        spots.push(full(x, y, x + 23.28, y + 49.49));
      }
      y += count === 12 ? 90.61 : SEAT.rowStep;
    }
    return spots;
  }

  const columns = count <= 20 ? 5 : 8;
  const ring = count <= 20 ? 40 : 32;
  const labelSize = count <= 20 ? 13 : 10;
  const rows = Math.ceil(count / columns);
  const xStep = (AREA.right - AREA.left - ring) / (columns - 1);
  // A row is the ring, the "3 Name" line and the gift pill under it.
  const rowHeight = ring + 2 * labelSize + 14;
  const yStep = Math.min(rowHeight, (AREA.bottom - AREA.top - ring - labelSize - 4) / Math.max(1, rows - 1));
  return Array.from({ length: count }, (_, i) => {
    const x = AREA.left + (i % columns) * xStep;
    const y = AREA.top + Math.floor(i / columns) * yStep;
    return { x, y, labelX: x + ring / 2, labelY: y + ring + 1, ring, labelSize };
  });
}

/** Where the last row of Figma's ten starts — everything below moves with it. */
export const LAST_ROW_Y = 388.22;

/** Rectangle 46 + its text (34:2265 / 34:2266). */
export const NOTICE = {
  x: 18,
  y: 482,
  width: 366,
  minHeight: 79,
  radius: 10,
  text: { x: 31, y: 496, width: 345, size: 11 },
} as const;

/** Frame 38:278 — All / Message / Gift. */
export const CHAT_TABS = { x: 20, y: 584, gap: 14, size: 16 } as const;

/**
 * The chat rows (34:2364, 38:301): 236 wide, 53 tall, 65 apart. Inside, the
 * 32 avatar, a 73-wide name-over-badges column, then the line itself.
 */
export const CHAT = {
  top: 624,
  bottom: 777,
  x: 18,
  width: 300,
  rowHeight: 53,
  rowGap: 12,
  radius: 10,
  pad: { left: 8, top: 11 },
  avatar: 32,
  avatarGap: 5,
  nameColumn: 73,
  name: { size: 12, height: 15 },
  badges: { width: 73, height: 16, imageLeft: 0.0065, imageWidth: 0.9423 },
  textGap: 4,
  text: { size: 11, height: 16 },
} as const;

/** The right-hand column: menu (577:5059), Lucky Wheel (576:4830), gift (45:2542). */
export const SIDE = {
  menu: { x: 329, y: 643, size: 41, svg: { dx: -6, dy: -2, size: 53 } },
  wheel: { x: 326, y: 708, size: 43, label: { centerX: 347, y: 751.49, width: 56, size: 9 } },
  gift: {
    ring: { x: 318.64, y: 790.74, width: 47.56, height: 44.588 },
    box: { x: 306, y: 762, size: 74.405, image: 61.863, rotate: '-13.26deg' },
  },
} as const;

/** The bottom row: input (34:2350), volume (34:2369), mic (38:280), emoji (38:290). */
export const CONTROLS = {
  input: { x: 18, y: 791, width: 168, height: 45, textX: 35, size: 13 },
  ring: 34,
  ringSvg: { dx: -6, dy: -2, size: 46 },
  volume: { x: 194, y: 797, glyph: { x: 201.75, y: 807.03, width: 15.88, height: 12.42 } },
  mic: { x: 233, y: 797 },
  emoji: { x: 272, y: 797, glyph: { x: 279, y: 804, size: 20 } },
} as const;

/** Frame 49:809 — "Are you sure you want to leave?". */
export const LEAVE = {
  x: 47,
  y: 367,
  width: 304,
  height: 146,
  radius: 10,
  title: { y: 30, width: 233, size: 16 },
  buttons: { gap: 12, top: 21, width: 112, height: 44, radius: 9, size: 15 },
} as const;

/** Frame 45:2759 — the right-hand drawer: minimise, exit, other live rooms. */
export const DRAWER = {
  x: 172,
  width: 235,
  button: { size: 54, radius: 27, icon: 29, y: 65, minimizeX: 52, exitX: 149 },
  line: { y: 134, width: 234 },
  card: {
    x: 26,
    y: 154,
    step: 207,
    width: 180,
    height: 192,
    radius: 14,
    info: { x: 12, y: 125, width: 83 },
    flag: { width: 19, height: 12, top: 5 },
    title: { left: 24, top: 2, size: 12 },
    stack: { top: 27, size: 29, overlap: 17 },
    count: { x: 130, y: 16, width: 51.13, height: 34, waveX: 137, waveY: 26, wave: 17, textCenterX: 168.5, textY: 7, size: 14 },
  },
} as const;

/** Frame 1597881342 — Tools and Games, white, from y 272 to the bottom. */
export const TOOLS = {
  y: 272,
  title: { centerX: 48.5, y: 34, size: 16 },
  close: { x: 346, y: 34, size: 24 },
  rows: [
    { y: 97, items: [{ width: 85, icon: 39 }, { width: 102, icon: 36 }, { width: 102, icon: 39 }] },
    { y: 210, items: [{ width: 85, icon: 36 }, { width: 102, icon: 36 }, { width: 102, icon: 36 }] },
  ],
  rowX: 27,
  rowGap: 28,
  lock: { x: 14, y: 312, width: 102, icon: 38 },
  iconGap: 6,
  label: { size: 16 },
  games: {
    title: { centerX: 60, y: 410, size: 18 },
    redPacket: { x: 27, y: 459, width: 87, box: { width: 50, height: 58, radius: 8 } },
    luckyDraw: { x: 152, y: 459, width: 87, image: { width: 71, height: 63 } },
    luckyNumber: { x: 277, y: 470, width: 87, image: { width: 107, height: 52 } },
    gap: 11,
  },
} as const;

/** Frame 2112 — "Set Kickout duration". */
export const KICKOUT = {
  y: 397,
  radius: 15,
  close: { x: 360, y: 23, size: 27 },
  title: { y: 40, size: 17 },
  list: { x: 15, y: 93, width: 372, gap: 11 },
  option: { height: 62, radius: 10, textX: 23, size: 15, radio: { x: 325, size: 30 }, check: 14 },
  buttons: { y: 401, height: 43, radius: 31, size: 13, cancel: { x: 15, width: 171 }, confirm: { x: 217, width: 170 } },
} as const;

/** The minutes behind each of Frame 2112's four choices. */
export const KICKOUT_CHOICES = [
  { label: '5 min', minutes: 5 },
  { label: '1 hr', minutes: 60 },
  { label: '24 hr', minutes: 1440 },
  { label: '7 Days', minutes: 10080 },
] as const;

/**
 * 592:7686 — the gift sheet. Figma has it only as a flattened screenshot, so
 * these are measured off that render: 403 tall, flush to the bottom.
 */
export const GIFTS = {
  height: 403,
  tabs: { x: 14, y: 14, gap: 8, size: 17, underline: { width: 14, height: 3, gap: 6 } },
  grid: { x: 16, y: 66, cardWidth: 92, cardHeight: 124, colGap: 1.33, rowGap: 6, columns: 4, rows: 2 },
  thumb: { size: 66, top: 6 },
  price: { top: 78, size: 12, coin: 14 },
  name: { top: 98, size: 12 },
  dots: { y: 338, size: 6, gap: 10 },
  bar: { height: 55, pill: { x: 16, height: 34, radius: 17 }, send: { width: 56 }, qty: { width: 114 } },
} as const;

/** 613:6542 — Music, a white sheet at y 422 over a dark scrim. */
export const MUSIC = {
  y: 422,
  radius: 15,
  handle: { y: 438 - 422, width: 30, height: 3 },
  tabs: { y: 466 - 422, size: 21, playlistX: 141.59, localX: 268.69, width: 106 },
  search: { x: 35, y: 508 - 422, width: 333, height: 47, icon: 21, gap: 19, size: 16 },
  list: { y: 572 - 422 },
} as const;

/** Group 8778 — "Share to": Facebook, WhatsApp, Friends. */
export const SHARE = {
  y: 601,
  height: 242,
  radius: 5,
  title: { y: 626 - 601, size: 18 },
  icon: { size: 62, y: 677 - 601 },
  label: { y: 750 - 601, size: 15 },
  items: [
    { centerX: 60.5, iconX: 27 },
    { centerX: 206.5, iconX: 175 },
    { centerX: 350.5, iconX: 318 },
  ],
} as const;

/** room-games' "More" sheet (613:4733): 644 tall from y 209, the games as one image. */
export const GAMES = { y: 209, height: 644, radius: 10 } as const;
