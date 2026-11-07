import type { Box } from '../../components/figmaLayers';

// Wealth Level (2015:9314) and Charm Level (2015:9378) — one layout, two themes.
// Every number is a page coordinate on the 402-wide frame unless it says otherwise.

export type LevelKind = 'wealth' | 'charm';

export const PAGE = {
  height: 1129,
  background: { x: 0, y: 0, w: 402, h: 1334 } as Box,
  /** chevron_backward is a 32px box; its glyph (9.87x16) sits centred in it. */
  back: { x: 23, y: 79, w: 32, h: 32 } as Box,
  glyph: { w: 9.86667, h: 16 },
};

/** Group 8751 — the two names; the inactive one is white at 50%. */
export const TABS = {
  y: 79,
  size: 21,
  lineHeight: 32,
  wealth: { x: 105, w: 74 },
  charm: { x: 220, w: 77 },
};

/** Frame 64 — the coloured card. Children below are relative to its inside (1px border). */
export const CARD = {
  box: { x: 18, y: 149, w: 365, h: 259 } as Box,
  radius: 10,
  border: '#FFDE07',
  levels: { y: 105, left: 19, right: 310, w: 36, size: 12, lineHeight: 15 },
  avatar: { x: 144, y: 19, w: 76, h: 76 } as Box,
  /** Frame 1597881384 / 1597881385 — Current Consumption (Total Income) and Next Level. */
  stats: [
    { x: 11, y: 150, w: 167, h: 88 },
    { x: 186, y: 150, w: 167, h: 88 },
  ] as Box[],
  stat: {
    border: 'rgba(255,238,238,0.4)',
    radius: 8,
    labelY: 12,
    labelSize: 11,
    rowY: 45,
    rowH: 24,
    valueSize: 23,
    lineHeight: 15,
    /**
     * Figma's 15px line under a 23px amount only works on the web, where glyphs spill
     * out of their line; Android and iOS cut them off. The row centres the text, so a
     * taller line keeps the same visual position.
     */
    valueLineHeight: 30,
    coin: 24,
    gap: 4,
  },
};

/** The progress bar sits on the page, over the card. */
export const BAR = {
  track: { x: 39, y: 278.87, w: 328, h: 10.473 } as Box,
  trackColors: ['#F1F3F8', '#B8BCC2'] as const,
  trackBorder: '#FFDE07',
  /** The fill starts at 36 and is 45 wide with the thumb at its resting place. */
  fill: { x: 36, w: 45 },
  thumb: 17,
  /** The thumb's svg box is larger than the ellipse: its drop shadow. */
  thumbSvg: { dx: -0.8, dy: -4.8, size: 28.6 },
  /** Thumb left edge at 0% — its right end stops on the track's right edge. */
  thumbEnd: 39 + 328 - 17,
};

export const BLURB = { x: 18, y: 421, w: 355, size: 12, lineHeight: 15 };

/** Frame 66 — Level Intervals & Grade Medals. Children are relative to its inside. */
export const LIST = {
  box: { x: 19, y: 483, w: 365, h: 628 } as Box,
  fill: '#050505',
  radius: 10,
  /** Figma's line is 15px under a 16px font; 22px around the same centre so phones don't clip it. */
  title: { x: 47, y: 16 - 3.5, w: 250, size: 16, lineHeight: 22 },
  row: { x: 19, w: 223, size: 14, lineHeight: 15 },
  rowY: [63, 110, 157, 204, 251, 298, 345, 392, 439, 486, 537, 586],
  divider: { x: 15, w: 333 },
  /** Lines 10–20; each svg is 1px tall and drawn from 1px above its line. */
  dividerY: [93, 140, 187, 234, 281, 328, 375, 422, 469, 520, 569],
  medal: { w: 37, h: 14 },
};

type Theme = {
  name: string;
  card: string;
  fill: { color: string; border?: string };
  thumbX: number;
  stat: string;
  blurb: string;
  /** Medal slot per row, Lv.1–10 first. */
  medals: Array<{ x: number; y: number }>;
};

export const THEME: Record<LevelKind, Theme> = {
  wealth: {
    name: 'wealth',
    card: '#FF4B1D',
    fill: { color: '#FEDD07', border: '#F3D619' },
    thumbX: 77,
    stat: 'Current Consumption',
    blurb: 'Wealth level is based on user’s gifts contribution data .the more gift contributions , the higher the wealth level',
    medals: [66, 110, 157, 204, 251, 298, 345, 392, 439, 486, 533, 580].map((y) => ({ x: 305, y })),
  },
  charm: {
    name: 'Charm',
    card: '#FFA44A',
    fill: { color: '#E3862B' },
    thumbX: 72,
    stat: 'Total Income',
    blurb: 'Charm level is based on  gift Point income . The higher the points income , the higher the charm level.',
    medals: [67, 114, 161, 208, 255, 302, 349, 396, 443, 490, 537, 584].map((y) => ({ x: 302, y })),
  },
};
