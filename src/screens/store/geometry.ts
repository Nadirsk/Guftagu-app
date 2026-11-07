/**
 * Mall (Figma section 4002:8276). The Mall frames (4001:7883 grid, 4001:7953 item sheet,
 * 4001:8036 purchase confirm) are drawn on the usual 402-wide canvas over a magenta
 * gradient; the app keeps them on white, so their white text is drawn black. The Select
 * frames (4001:8124 / 8135 / 8146) are 440 wide and black, so their numbers go through
 * `SELECT_SCALE` first.
 */

export const ORANGE = '#FF7700';

/** Send and Cancel: the translucent pill beside the orange one. */
export const GHOST = { background: 'rgba(255,255,255,0.19)', border: 'rgba(255,255,255,0.1)' };

/** 4001:7883 — the grid page. */
export const STORE = {
  back: { x: 21, y: 46, size: 34 },
  title: { y: 49, width: 227, size: 21, line: 29 },
  /** Group 8756: Poppins SemiBold 15, the closed ones at 70%; Line 8 is 24 wide, centred, its 1px stroke ending 30 below. */
  tabs: { x: 18, y: 120, gap: 21, size: 15, line: 23, inactive: 0.7, underlineY: 29, underlineWidth: 24, underline: 1 },
  grid: { x: 18, y: 187, colGap: 16, rowGap: 29 },
  card: {
    width: 171,
    height: 195,
    radius: 17,
    background: '#2A2238',
    image: { width: 83, height: 76, top: 36 },
    bar: { top: 129, height: 66, background: 'rgba(0,0,0,0.35)' },
    name: { top: 9, size: 15, line: 23 },
    price: { top: 33 },
  },
  /** "image 19" — the coin before every price, and its caption. */
  price: { coin: { width: 18, height: 17 }, gap: 4, size: 13, line: 20 },
} as const;

/** 4001:7953 — tapping a card: the page fades, and the item stands on a podium over its name and two buttons. */
export const SHEET = {
  /** Rectangle 161124094: 622 tall, pinned to the bottom, black at 87% from 38.531% down. */
  fadeHeight: 622,
  fadeFull: 0.38531,
  fadeColor: 'rgba(0,0,0,0.87)',
  /** From the item's top (y 421) to the buttons' bottom (805); 892 − 805 = 87 below. */
  top: 421,
  bottom: 87,
  item: { size: 141, dx: 0.5 },
  /** Ellipse 55 — your own avatar, worn in the frame. */
  avatar: { top: 446, size: 96, dx: -3 },
  /** voiceroom_act_dialog_bg_top2. */
  podium: { top: 517, width: 359, height: 150 },
  name: { top: 678, size: 18, line: 27 },
  priceGap: 5,
  buttons: { top: 761, width: 169, height: 44, gap: 8, radius: 32, size: 13 },
} as const;

/** 4001:8107 / 4001:8158 — "Are you sure…", centred on both canvases. */
export const DIALOG = {
  width: 358,
  height: 343,
  radius: 14,
  scrim: 'rgba(0,0,0,0.49)',
  /** `from-1/4 from-black to-[#a5aab3]`. */
  gradient: { colors: ['#000000', '#000000', '#A5AAB3'] as const, locations: [0, 0.25, 1] as const },
  /** Only the send one has a border. */
  sendBorder: 'rgba(255,255,255,0.38)',
  /** The frame, with the wearer's avatar (Ellipse 55 / 88) inside it. */
  preview: { top: 24, size: 99, avatar: 61 },
  name: { top: 135, size: 18, line: 27 },
  price: { top: 167 },
  question: { top: 212, width: 278, sendWidth: 292, size: 18, line: 27 },
  buttons: { top: 269, width: 148, height: 44, gap: 11, radius: 32, size: 13 },
} as const;

/** 440-wide Select frames → the app's 402 design pixels. */
export const SELECT_SCALE = 402 / 440;

/** 4001:8124 (Friends) / 4001:8135 (Follow), in their own 440-wide pixels. */
export const SELECT = {
  back: { x: 15, y: 48, size: 34 },
  title: { y: 48, size: 25, line: 38 },
  /** Centres of the two labels; Line 81 (45 × 2) starts under each label, 32 below its top. */
  tabs: { y: 135, friendsCenter: 162, followCenter: 283, size: 20, line: 30, underlineY: 32, underlineWidth: 45, underline: 2, inactive: 'rgba(255,255,255,0.58)' },
  list: { x: 15, y: 255, right: 19, rowGap: 20 },
  row: { avatar: 68, height: 70, nameGap: 10, name: 18, nameLine: 27 },
  send: { width: 87, height: 40, radius: 9, size: 14, line: 21, background: 'rgba(255,139,37,0.13)', color: '#FE7F00' },
} as const;
