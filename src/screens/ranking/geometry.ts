// Rankings — E20HaZSfa6z2BNDlbutRuL. Charm is section 590:6566: 590:6567 / 590:6684 /
// 590:6802 are its Daily / "Weakly" / Monthly pages (identical but for the gold
// pill), 590:6919 adds the Reward plaque and 590:7029 is the weekly reward screen
// it opens. Rich is section 590:5995: 590:5996 / 590:6112 / 590:6230 and its reward
// screen 590:6460. Every value is the frame's own pixels.
//
// The Rich pages share Charm's layout but not its colours: a black page with one
// full-bleed backdrop instead of the blue gradient, crowd photo and glitter. Figma's Rich Daily frame also nudges the header and podium down by
// 19-39px; that offset is not copied, so switching period never moves the page.

import type { Box, Crop } from '../../components/figmaLayers';

export type Board = 'wealth' | 'charm';
export type Period = 'daily' | 'weekly' | 'monthly';

export const PAGE = {
  height: 1329,
  back: { x: 30, y: 73, w: 34, h: 34 } as Box,
};

/** A gradient page under the crowd photo, glitter and a fade — Charm's. */
export type GradientBackdrop = {
  gradient: { colors: readonly [string, string, string]; locations: readonly [number, number, number] };
  photo: Box;
  sparkle: Box;
  fade: { box: Box; colors: readonly [string, string, string]; locations: readonly [number, number, number] };
};

/** The Charm pages' backdrop. */
export const CHARM_BACKDROP: GradientBackdrop = {
  /** The frame's own fill: #3945AE → #11034C → #1B1866. */
  gradient: { colors: ['#3945AE', '#11034C', '#1B1866'] as const, locations: [0.10096, 0.63537, 1] as const },
  // Rectangle 34 (a crowd photo at 20%) and 10520 1 (glitter at 50%): the exports
  // already carry that opacity in their alpha, so they are drawn as they are.
  photo: { x: -234, y: 0, w: 874, h: 698.53 } as Box,
  sparkle: { x: -72, y: 168, w: 550, h: 531 } as Box,
  /** Rectangle 49 — fades the photo out behind the list (Figma's 179.48° ≈ straight down). */
  fade: {
    box: { x: -49, y: 496, w: 461, h: 858 } as Box,
    colors: ['rgba(58,2,2,0.13)', 'rgb(1,4,20)', 'rgb(21,8,82)'] as const,
    locations: [0.069958, 0.23366, 0.65768] as const,
  },
};

/**
 * The Rich pages: black, under the Daily frame's image 205699. Figma gives Weekly
 * and Monthly their own backdrops (205701 / 205703); the Daily one is used for all
 * three instead, by request.
 */
export const RICH_BACKDROP: { box: Box; crop: Crop } = {
  box: { x: 0, y: 0, w: 404, h: 1654 },
  crop: { w: 100, h: 99.96, l: 0, t: 0 },
};

/**
 * "Rich" / "Charm". An idle label keeps the opacity Figma gives it: Charm 50%
 * on the Rich pages, Rich 70% on the Charm pages.
 */
export const BOARD_TOGGLE = {
  y: 79.75, // centred on 91
  size: 15,
  lineHeight: 22.5,
  idleOpacity: { wealth: 0.7, charm: 0.5 } as Record<Board, number>,
  cx: { wealth: 163, charm: 239 } as Record<Board, number>,
};

/** Group 95 + Group 8755 — the Daily / Weekly / Monthly switch. */
export const PERIOD_SWITCH = {
  bar: { x: 59, y: 130, w: 287, h: 38 } as Box,
  barFill: 'rgba(1,1,1,0.48)',
  barStroke: '#FECB00',
  // The pill is drawn flipped, so its gradient runs #FFDE07 at the top to #FBBC05.
  pill: { y: 137.14, w: 68, h: 23.855 },
  pillColors: ['#FFDE07', '#FBBC05'] as const,
  pillStroke: '#F554E0',
  pillX: { daily: 94, weekly: 166, monthly: 238 } as Record<Period, number>,
  labelCx: { daily: 128, weekly: 202, monthly: 276 } as Record<Period, number>,
  labelY: 140, // centred on 149
  labelSize: 12,
  labelHeight: 18,
  selected: '#7D1162',
};

/** Groups 8749 / 8757-8760 — rank 4 onward, one row every 96px. */
export const ROWS = {
  y: 727,
  step: 96,
  rankCx: 32.47,
  rankDy: 23,
  avatar: { x: 51.53, y: 0, w: 68, h: 68 } as Box,
  nameX: 131.53,
  nameDy: 10,
  nameW: 150,
  idX: 132.53,
  idDy: 36,
  coin: { x: 291.53, y: 24, w: 20, h: 20 } as Box,
  scoreCx: 341.03,
  scoreDy: 23,
  scoreW: 79,
};

/** Frame 1597881028 (in 590:6919) — hangs off the right edge on the Weekly page. */
export const REWARD_BUTTON = {
  box: { x: 280, y: 397, w: 171, h: 55 } as Box,
  crop: { w: 115.98, h: 202.29, l: -7.4, t: -46.1 } as Crop,
  labelCx: 85,
  labelY: 17,
};

// ---- the three-place podium, shared by both screens ---------------------------

/**
 * Name / ID / score under a podium frame; `info` is Frame 1597881244's origin.
 * `frameCrop` is set when the frame bitmap is cropped rather than fitted.
 */
export type PodiumSpot = {
  frame: Box;
  frameCrop?: Crop;
  avatar: Box;
  info: { x: number; y: number };
  avatarOnTop: boolean;
};
export type PodiumSpec = [PodiumSpot, PodiumSpot, PodiumSpot];

export const PODIUM_INFO = {
  nameDx: 31,
  nameY: 0.25,
  idDx: 28,
  idY: 14,
  coin: { x: 0, y: 38, w: 10, h: 10 } as Box,
  scoreX: 10,
  scoreY: 32,
  scoreW: 46,
};

/** Group 1597881056 on the ranking pages. */
export const PODIUM_PAGE: PodiumSpec = [
  { frame: { x: 68, y: 194, w: 270, h: 240 }, avatar: { x: 172, y: 255, w: 62, h: 62 }, info: { x: 175, y: 347 }, avatarOnTop: true },
  { frame: { x: 19, y: 450, w: 167, h: 214 }, avatar: { x: 68, y: 483, w: 71, h: 62 }, info: { x: 73, y: 579 }, avatarOnTop: true },
  { frame: { x: 217, y: 450, w: 167, h: 214 }, avatar: { x: 265, y: 486, w: 71, h: 62 }, info: { x: 271, y: 584 }, avatarOnTop: false },
];

// ---- the weekly reward screens (590:7029 Charm, 590:6460 Rich) -------------------

type RewardTheme = {
  height: number;
  gradient: { colors: readonly [string, string, string]; locations: readonly [number, number, number] };
  /** Rectangle 49 — an SVG gradient, used as exported. */
  backdrop: Box;
  /** Rich only: image 205701, the red stage (the Weekly page's own backdrop in Figma), under everything. */
  stage?: { box: Box; crop: Crop };
  /** Charm only: Rectangle 34, the crowd photo, over the header (its 20% is in the export). */
  photo?: Box;
  honor: { y: number; color: string };
  blurbY: number;
  countdownBg: Box;
  countdownRow: { x: number; y: number };
  cards: { x: number; y: number };
  podium: PodiumSpec;
};

const CHARM_REWARD: RewardTheme = {
  height: 1775,
  gradient: { colors: ['#181A93', '#05B4FF', '#030A1E'], locations: [0.10096, 0.63537, 1] },
  backdrop: { x: -3, y: 393, w: 435, h: 1315 },
  photo: { x: -246, y: -6, w: 804, h: 680 },
  honor: { y: 172, color: '#FEDE0F' },
  blurbY: 207,
  countdownBg: { x: 15, y: 820, w: 370, h: 166 },
  countdownRow: { x: 68, y: 894 },
  cards: { x: 13, y: 1004 },
  podium: [
    { frame: { x: 66, y: 303, w: 270, h: 240 }, avatar: { x: 172, y: 364, w: 62, h: 62 }, info: { x: 175, y: 456 }, avatarOnTop: true },
    { frame: { x: 19, y: 559, w: 167, h: 214 }, avatar: { x: 68, y: 592, w: 71, h: 62 }, info: { x: 73, y: 688 }, avatarOnTop: true },
    { frame: { x: 217, y: 559, w: 167, h: 214 }, avatar: { x: 265, y: 595, w: 71, h: 62 }, info: { x: 271, y: 693 }, avatarOnTop: false },
  ],
};

export const REWARD_THEME: Record<Board, RewardTheme> = {
  charm: CHARM_REWARD,
  wealth: {
    height: 1802,
    gradient: { colors: ['#3A0202', '#BC16AB', '#030A1E'], locations: [0.10096, 0.63537, 1] },
    backdrop: { x: -16, y: 400, w: 435, h: 1608 },
    stage: { box: { x: 0, y: 0, w: 402, h: 1555 }, crop: { w: 100.07, h: 99.98, l: -0.04, t: 0 } },
    honor: { y: 168, color: '#FFDE07' },
    blurbY: 203,
    countdownBg: { x: 15, y: 809, w: 370, h: 166 },
    countdownRow: { x: 68, y: 883 },
    cards: { x: 14, y: 997 },
    podium: [
      // A different, smaller "Top1" crown, cropped out of a larger bitmap.
      {
        frame: { x: 81, y: 301, w: 242, h: 240 },
        frameCrop: { w: 141.91, h: 126.96, l: -20.95, t: -12.08 },
        avatar: { x: 171, y: 362, w: 62, h: 62 },
        info: { x: 174, y: 454 },
        avatarOnTop: true,
      },
      { frame: { x: 18, y: 557, w: 167, h: 214 }, avatar: { x: 67, y: 590, w: 71, h: 62 }, info: { x: 72, y: 686 }, avatarOnTop: true },
      { frame: { x: 216, y: 557, w: 167, h: 214 }, avatar: { x: 264, y: 593, w: 71, h: 62 }, info: { x: 270, y: 691 }, avatarOnTop: false },
    ],
  },
};

/** What both reward screens draw identically. */
export const REWARD_PAGE = {
  radius: 20,
  backDisc: { x: 18, y: 51, w: 30, h: 30 } as Box,
  backArrow: { x: 20, y: 54, w: 24, h: 24 } as Box,
  ribbon: { x: 55, y: 78, w: 291, h: 76 } as Box,
  ribbonCrop: { w: 100.03, h: 288.89, l: -0.01, t: -90.74 } as Crop,
  title: { cx: 201.5, y: 106.25, size: 17, lineHeight: 25.5 },
  honor: { cx: 201, w: 178, size: 22, lineHeight: 25 },
  // Inter in Figma; Poppins runs wider, so it is set a size down to keep four lines.
  blurb: { cx: 201, w: 308, size: 15.5, lineHeight: 20.5, color: 'rgba(255,255,255,0.76)' },
};

/** Frames 9028-9030 — "Week Top N" cards, 251px apart; children are card-relative. */
export const REWARD_CARD = {
  step: 251,
  bg: { x: 1, y: 26, w: 370, h: 199 } as Box,
  bgCrop: { w: 100, h: 177.49, l: 0, t: 0.76 } as Crop,
  edgeCrop: { w: 99.14, h: 151.02, l: 0.41, t: -44.9 } as Crop,
  edgeBottom: { x: 1, y: 189, w: 372, h: 36 } as Box,
  edgeTop: { x: 7, y: 27, w: 364, h: 58 } as Box,
  ribbon: { x: 46, y: 0, w: 277, h: 71 } as Box,
  ribbonCrop: { w: 100.44, h: 297.96, l: -0.22, t: -93.88 } as Crop,
  titleCx: 187,
  titleY: 29,
  tileLeft: { x: 36, y: 118, w: 46, h: 46 } as Box,
  tileRight: { x: 277, y: 118, w: 46, h: 46 } as Box,
  coins: { x: 148, y: 118, w: 59, h: 46 } as Box,
  coinsCrop: { w: 91.05, h: 100, l: 4.72, t: 0 } as Crop,
  labelY: 170,
  labelCx: { left: 59, middle: 177.5, right: 299 },
};
