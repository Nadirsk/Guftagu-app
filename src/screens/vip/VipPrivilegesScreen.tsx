import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import * as vip from '../../assets/vip/icons';
import { TIER_SVGS, type TierSvgs } from '../../assets/vip/tierSvgs';
import { useDesignScale } from '../../theme/layout';
import { typography } from '../../theme/tokens';

/**
 * Aristocracy Privileges (Figma 176:1116: VIP 1 is 176:1716, VIP 2 176:1865 …, 390 x 844, so every
 * figure is scaled by 402 / 390). One layout, one table per tier: its stage art, its price, and which
 * privileges it lists and where. VIP 1-3 draw the green VIP 1 vectors turned to the tier's hue
 * (`hue` degrees), which is how Figma recolours them; VIP 4-8 carry their own exported vectors
 * (`svgs`, assets/vip/tierSvgs.ts) because their gradients are no longer one hue. The stage art, the
 * hue-blend overlay Figma lays over it (VIP 4, 6-8), the banner and the crest labels are baked into
 * the tier's PNGs, since React Native has no blend modes.
 * Nothing on the server sells a tier yet, so "Become VIP" only says so.
 */

const FW = 390;
const FH = 844;

type Box = [number, number, number, number]; // t r b l, in % of the frame
type InsetIcon = { xml: string; outer: Box; inner: Box; flip?: boolean };

/** Icons Figma places by insets of the frame; `card` moves a few tenths from tier to tier. */
const INSET: Record<string, InsetIcon> = {
  medal: { xml: vip.medal, outer: [55.45, 75.93, 41.54, 16.67], inner: [-46.57, -137.64, -804.38, -271.56] },
  frame: { xml: vip.frameIcon, outer: [54.86, 46.78, 41.21, 46.67], inner: [-31.45, -137.13, -543.29, -270.55] },
  wave: { xml: vip.wave, outer: [66, 74.3, 30.19, 17.18], inner: [-34.21, -111.34, -590.86, -219.68], flip: true },
  bubble: { xml: vip.bubble, outer: [66.71, 47.12, 30.54, 46.92], inner: [-47.31, -159.14, -817.2, -313.98] },
  card: { xml: vip.card, outer: [66.94, 17.31, 30.46, 73.96], inner: [-52.59, -113.87, -908.31, -224.66] },
  entry: { xml: vip.entry, outer: [77.61, 46.41, 19.31, 46.92], inner: [-45.83, -154.17, -791.62, -304.17] },
  gift: { xml: vip.gift, outer: [77.65, 16.47, 19.27, 76.15], inner: [-42.36, -128.7, -731.74, -253.91] },
  hidden: { xml: vip.hidden, outer: [88.98, 75.73, 8.2, 16.15], inner: [-44.44, -112.12, -767.67, -221.21] },
};
/** Icons Figma draws in boxes of their own, at the same place in every tier. */
type Fixed = 'car' | 'tag' | 'mystery' | 'nick';
type Key = keyof typeof INSET | Fixed;

/** `outer` replaces the icon's inset when Figma nudged it away from where its disc would put it. */
type Cell = { icon: Key; x: number; y: number; label: string; lx: number; ly: number; disc: 'a' | 'b'; outer?: Box };
type Rect = [number, number, number, number]; // x y w h in frame points
type Tier = {
  hue: number;
  /** How much more saturated the tier's colours are than VIP 1's muted green (1 = the same). */
  sat: number;
  /** The tier's own icon vectors; without them the VIP 1 vectors are tinted by `hue`/`sat`. */
  svgs?: TierSvgs;
  price: string;
  count: string;
  /** x of the active-tab underline inside the tab strip, and its y below the strip's top (default 26). */
  underline: number;
  underlineY?: number;
  /** How far the tab strip is scrolled in this tier's frame (VIP 6-8 show VIP 4-8). */
  scrollX?: number;
  art: { top: ImageSourcePropType; emblem: ImageSourcePropType; ram: ImageSourcePropType; car: ImageSourcePropType; banner: ImageSourcePropType };
  /** Where Figma puts the emblem, the crest (`ram`) and the banner; the defaults are VIP 1-3's. */
  emblemBox?: Rect;
  ramBox?: Rect;
  /** VIP 5's crest sits under the panel and the emblem; every other tier's is drawn last. */
  ramBelow?: boolean;
  bannerBox?: Rect;
  cells: Cell[];
};

const EMBLEM_BOX: Rect = [93, 259, 200, 200];
const RAM_BOX: Rect = [106, 131, 178.66, 171.37];
const BANNER_BOX: Rect = [69, 369, 253.33, 60];

/** Where VIP 1 puts each inset icon's disc; the other tiers' insets move with their discs by the same amount. */
const REF: Record<string, [number, number]> = {
  medal: [54, 456],
  frame: [170, 456],
  wave: [55, 550],
  bubble: [170, 550],
  card: [284, 551],
  entry: [172, 644],
  gift: [287, 644],
  hidden: [54, 738],
};
/** The fixed icons sit at the same offset from their disc in every tier: dx, dy, size. */
const FIXED_AT: Record<Fixed, [number, number, number]> = { car: [5, 5, 39], tag: [10, 10, 29], mystery: [8, 9, 32], nick: [14, 12, 25] };

/** The twelve cells VIP 4-8 list: the same icons and labels, but VIP 4's grid sits a few points off VIP 5-8's. */
function grid(v4: boolean): Cell[] {
  const c = (icon: Key, x: number, y: number, label: string, lx: number, ly: number, disc: 'a' | 'b', outer?: Box): Cell => ({ icon, x, y, label, lx, ly, disc, outer });
  return v4
    ? [
        c('medal', 54, 456, 'Aristocracy ic...', 46, 510, 'a'),
        c('frame', 170, 456, 'Aristocracy ic...', 162, 510, 'b'),
        c('car', 287, 456, 'Get the car', 286, 510, 'a'),
        c('wave', 55, 550, 'Special entry...', 47, 604, 'a'),
        c('bubble', 170, 550, 'Colorful mess...', 162, 604, 'b'),
        c('card', 281, 550, 'Flying comm...', 280, 604, 'a'),
        c('tag', 58, 644, 'Exclusive gift', 50, 698, 'a'),
        c('entry', 172, 644, 'Prevent from...', 164, 698, 'b'),
        c('gift', 287, 644, 'Anti ban', 293, 698, 'a'),
        c('hidden', 54, 738, 'Hidden', 59, 792, 'a'),
        c('mystery', 173, 738, 'Mystery man..', 165, 792, 'b'),
        c('nick', 287, 738, 'Colorful nick...', 281, 792, 'a'),
      ]
    : [
        c('medal', 54, 456, 'Aristocracy ic...', 46, 510, 'a'),
        c('frame', 171, 456, 'Aristocracy ic...', 163, 510, 'b'),
        c('car', 290, 456, 'Get the car', 289, 510, 'a'),
        c('wave', 55, 550, 'Special entry...', 47, 604, 'a', [65.88, 74.56, 30.31, 16.92]),
        c('bubble', 170, 550, 'Colorful mess...', 162, 604, 'b'),
        c('card', 284, 550, 'Flying comm...', 283, 604, 'a'),
        c('tag', 55, 644, 'Exclusive gift', 47, 698, 'a'),
        c('entry', 170, 644, 'Prevent from...', 162, 698, 'b'),
        c('gift', 284, 644, 'Anti ban', 290, 698, 'a'),
        c('hidden', 55, 738, 'Hidden', 60, 792, 'a'),
        c('mystery', 170, 738, 'Mystery man..', 162, 792, 'b'),
        c('nick', 284, 738, 'Colorful nick...', 278, 792, 'a'),
      ];
}

const TIERS: Record<number, Tier> = {
  1: {
    hue: 0,
    sat: 1,
    price: '300000',
    count: '(16/16)',
    underline: 32,
    art: {
      top: require('../../assets/vip/top-art.png'),
      emblem: require('../../assets/vip/emblem.png'),
      ram: require('../../assets/vip/ram.png'),
      car: require('../../assets/vip/car-body.png'),
      banner: require('../../assets/vip/banner-trim.png'),
    },
    cells: [
      { icon: 'medal', x: 54, y: 456, label: 'Exclusive Medal', lx: 46, ly: 510, disc: 'a' },
      { icon: 'frame', x: 170, y: 456, label: 'Exclusive Frame', lx: 162, ly: 510, disc: 'b' },
      { icon: 'car', x: 287, y: 456, label: 'Entry Banner', lx: 286, ly: 510, disc: 'a' },
      { icon: 'wave', x: 55, y: 550, label: 'Exclusive Mic Wave', lx: 47, ly: 604, disc: 'a' },
      { icon: 'bubble', x: 170, y: 550, label: 'Exclusive Bubble', lx: 162, ly: 604, disc: 'b' },
      { icon: 'card', x: 284, y: 551, label: 'Profile Card', lx: 286, ly: 603, disc: 'a' },
      { icon: 'tag', x: 58, y: 644, label: 'VIP Tag', lx: 50, ly: 698, disc: 'a' },
      { icon: 'entry', x: 172, y: 644, label: 'Exclusive Entry Effect', lx: 164, ly: 698, disc: 'b' },
      { icon: 'gift', x: 287, y: 644, label: 'VIP Gift', lx: 293, ly: 698, disc: 'a' },
      { icon: 'hidden', x: 54, y: 738, label: 'Hidden', lx: 59, ly: 792, disc: 'a' },
      { icon: 'mystery', x: 173, y: 738, label: 'Mystery man..', lx: 165, ly: 792, disc: 'b' },
      { icon: 'nick', x: 287, y: 738, label: 'Colorful nick...', lx: 281, ly: 792, disc: 'a' },
    ],
  },
  2: {
    hue: 59,
    sat: 2.2,
    price: '650000',
    count: '(16/16)',
    underline: 112,
    art: {
      top: require('../../assets/vip/t2/top-art.png'),
      emblem: require('../../assets/vip/t2/emblem.png'),
      ram: require('../../assets/vip/t2/ram.png'),
      car: require('../../assets/vip/t2/car-body.png'),
      banner: require('../../assets/vip/t2/banner.png'),
    },
    cells: [
      { icon: 'medal', x: 54, y: 456, label: 'Exclusive Medal', lx: 46, ly: 510, disc: 'a' },
      { icon: 'frame', x: 170, y: 456, label: 'Exclusive Frame', lx: 162, ly: 510, disc: 'b' },
      { icon: 'car', x: 287, y: 456, label: 'Entry Banner', lx: 283, ly: 510, disc: 'a' },
      { icon: 'wave', x: 55, y: 550, label: 'Exclusive Mic Wave', lx: 37, ly: 604, disc: 'a' },
      { icon: 'bubble', x: 170, y: 550, label: 'Exclusive Bubble', lx: 159, ly: 604, disc: 'b' },
      { icon: 'card', x: 281, y: 550, label: 'Profile Card', lx: 280, ly: 604, disc: 'a', outer: [66.82, 18.08, 30.58, 73.19] },
      { icon: 'tag', x: 58, y: 644, label: 'VIP tag', lx: 65, ly: 698, disc: 'a' },
      { icon: 'entry', x: 172, y: 644, label: ' Exclusive Entry effect', lx: 146, ly: 698, disc: 'b' },
      { icon: 'gift', x: 287, y: 644, label: 'VIP gift', lx: 293, ly: 698, disc: 'a' },
      { icon: 'hidden', x: 54, y: 738, label: 'colour Name', lx: 51, ly: 792, disc: 'a' },
      { icon: 'mystery', x: 173, y: 738, label: 'special id', lx: 177, ly: 792, disc: 'b' },
    ],
  },
  3: {
    hue: 112,
    sat: 0.8,
    price: '1400000',
    count: '(16/16)',
    underline: 192,
    art: {
      top: require('../../assets/vip/t3/top-art.png'),
      emblem: require('../../assets/vip/t3/emblem.png'),
      ram: require('../../assets/vip/t3/ram.png'),
      car: require('../../assets/vip/t3/car-body.png'),
      banner: require('../../assets/vip/t3/banner.png'),
    },
    cells: [
      { icon: 'medal', x: 54, y: 456, label: 'Exclusive Medal', lx: 46, ly: 510, disc: 'a' },
      { icon: 'frame', x: 170, y: 456, label: 'Exclusive Frame', lx: 162, ly: 510, disc: 'b' },
      { icon: 'car', x: 287, y: 456, label: 'Entry Banner', lx: 286, ly: 510, disc: 'a' },
      { icon: 'wave', x: 55, y: 550, label: 'Exclusive Mic Wave', lx: 38, ly: 604, disc: 'a' },
      { icon: 'bubble', x: 170, y: 550, label: 'Exclusive Bubble', lx: 162, ly: 604, disc: 'b' },
      { icon: 'card', x: 281, y: 550, label: 'Profile Card', lx: 284, ly: 604, disc: 'a', outer: [66.82, 18.08, 30.58, 73.19] },
      { icon: 'tag', x: 58, y: 644, label: 'VIP tag', lx: 67, ly: 698, disc: 'a' },
      { icon: 'entry', x: 172, y: 644, label: ' Exclusive Entry effect', lx: 148, ly: 698, disc: 'b' },
      { icon: 'gift', x: 287, y: 644, label: 'VIP gift', lx: 297, ly: 698, disc: 'a' },
      { icon: 'hidden', x: 54, y: 738, label: 'Hidden', lx: 59, ly: 792, disc: 'a' },
      { icon: 'mystery', x: 173, y: 738, label: 'Mystery man..', lx: 165, ly: 792, disc: 'b' },
      { icon: 'nick', x: 287, y: 738, label: 'Colorful nick...', lx: 281, ly: 792, disc: 'a' },
    ],
  },
};

/** VIP 4-8 art: the stage with Figma's hue blend baked in, the emblem, the crest, the car and the banner. */
function art(dir: 'vip4' | 'vip5' | 'vip6' | 'vip7' | 'vip8'): Tier['art'] {
  switch (dir) {
    case 'vip4':
      return { top: require('../../assets/vip/t4/top-art.png'), emblem: require('../../assets/vip/t4/emblem.png'), ram: require('../../assets/vip/t4/ram.png'), car: require('../../assets/vip/t4/car-body.png'), banner: require('../../assets/vip/t4/banner.png') };
    case 'vip5':
      return { top: require('../../assets/vip/t5/top-art.png'), emblem: require('../../assets/vip/t5/emblem.png'), ram: require('../../assets/vip/t5/ram.png'), car: require('../../assets/vip/t5/car-body.png'), banner: require('../../assets/vip/t5/banner.png') };
    case 'vip6':
      return { top: require('../../assets/vip/t6/top-art.png'), emblem: require('../../assets/vip/t6/emblem.png'), ram: require('../../assets/vip/t6/ram.png'), car: require('../../assets/vip/t6/car-body.png'), banner: require('../../assets/vip/t6/banner.png') };
    case 'vip7':
      return { top: require('../../assets/vip/t7/top-art.png'), emblem: require('../../assets/vip/t7/emblem.png'), ram: require('../../assets/vip/t7/ram.png'), car: require('../../assets/vip/t7/car-body.png'), banner: require('../../assets/vip/t7/banner.png') };
    case 'vip8':
      return { top: require('../../assets/vip/t8/top-art.png'), emblem: require('../../assets/vip/t8/emblem.png'), ram: require('../../assets/vip/t8/ram.png'), car: require('../../assets/vip/t8/car-body.png'), banner: require('../../assets/vip/t8/banner.png') };
  }
}

const BANNER_4: Rect = [75, 380, 239.75, 32];
const BANNER_5_8: Rect = [74, 379, 242.25, 34];

TIERS[4] = {
  hue: 0,
  sat: 1,
  svgs: TIER_SVGS[4],
  price: '2500000',
  count: '(16/16)',
  underline: 269,
  underlineY: 27,
  art: art('vip4'),
  bannerBox: BANNER_4,
  cells: grid(true),
};
TIERS[5] = {
  hue: 0,
  sat: 1,
  svgs: TIER_SVGS[5],
  price: '4000000',
  count: '(16/16)',
  underline: 347,
  underlineY: 25,
  art: art('vip5'),
  emblemBox: [95, 278, 200, 200],
  ramBox: [81, 115, 227, 197],
  ramBelow: true,
  bannerBox: BANNER_5_8,
  cells: grid(false),
};
TIERS[6] = {
  hue: 0,
  sat: 1,
  svgs: TIER_SVGS[6],
  price: '6000000',
  count: '(16/16)',
  underline: 424,
  underlineY: 25,
  scrollX: 235,
  art: art('vip6'),
  emblemBox: [68, 282, 254, 254],
  ramBox: [105, 129, 175, 175],
  bannerBox: BANNER_5_8,
  cells: grid(false),
};
TIERS[7] = {
  hue: 0,
  sat: 1,
  svgs: TIER_SVGS[7],
  price: '9000000',
  count: '(16/16)',
  underline: 502,
  underlineY: 23,
  scrollX: 234,
  art: art('vip7'),
  emblemBox: [81, 266, 227, 227],
  ramBox: [109, 130, 175, 174.453],
  bannerBox: BANNER_5_8,
  cells: grid(false),
};
TIERS[8] = {
  hue: 0,
  sat: 1,
  svgs: TIER_SVGS[8],
  price: '12000000',
  count: '(16/16)',
  underline: 581,
  underlineY: 25,
  scrollX: 234,
  art: art('vip8'),
  emblemBox: [67, 247, 255, 255],
  ramBox: [99, 131, 175, 172.266],
  bannerBox: BANNER_5_8,
  cells: grid(false),
};

const TABS = [1, 2, 3, 4, 5, 6, 7, 8];
const TAB_PITCH = 78;
const BG = vip.bg.replace('<svg', '<svg preserveAspectRatio="none"');

/** Turns every #RRGGBB in an svg by `deg` degrees of hue (Figma's tier recolour), leaving greys alone. */
function tint(xml: string, deg: number, sat = 1): string {
  if (!deg && sat === 1) return xml;
  return xml.replace(/#([0-9a-fA-F]{6})\b/g, (_m, hex: string) => {
    const n = parseInt(hex, 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d < 1e-6) return `#${hex}`;
    const s = Math.min(1, (d / (1 - Math.abs(2 * l - 1))) * sat);
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + deg + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [rr, gg, bb] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${to(rr)}${to(gg)}${to(bb)}`.toUpperCase();
  });
}

export default function VipPrivilegesScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const [tierNo, setTierNo] = useState(1);
  const tier = TIERS[tierNo];

  const u = (v: number) => px((v * 402) / FW);
  const box = (left: number, top: number, w: number, h: number) => ({ position: 'absolute' as const, left: u(left), top: u(top), width: u(w), height: u(h) });
  const font = (size: number, weight: 'regular' | 'medium' | 'semiBold' | 'bold', color = '#FFFFFF') => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: u(size),
    lineHeight: u(Math.round(size * 1.28)),
    color,
  });

  const tabs = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    tabs.current?.scrollTo({ x: u(TIERS[tierNo].scrollX ?? 0), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierNo]);

  const svg = useMemo(() => {
    const own = tier.svgs;
    /** The tier's own vector when it has one, else VIP 1's turned to the tier's hue. */
    const pick = (key: keyof TierSvgs, base: string) => own?.[key] ?? tint(base, tier.hue, tier.sat);
    return {
      lip: pick('lip', vip.lip),
      disc: { a: tint(vip.discA, tier.hue, tier.sat), b: tint(vip.discB, tier.hue, tier.sat) },
      back: vip.back,
      icons: Object.fromEntries(Object.entries(INSET).map(([k, v]) => [k, pick(k as keyof TierSvgs, v.xml)])) as Record<string, string>,
      tag: pick('tag', vip.tag),
      mystery: pick('mystery', vip.mystery),
      nick: pick('nick', vip.nick),
      carDetail: pick('carDetail', vip.carDetail),
    };
  }, [tier.svgs, tier.hue, tier.sat]);

  /** Figma's inset(…%) of the frame, then the svg's own overflow inset(…%) of that box. */
  const placed = (cell: Cell) => {
    const spec = INSET[cell.icon as string];
    // The icon rides on its disc: move the inset by how far this tier's disc is from VIP 1's.
    const [rx, ry] = REF[cell.icon as string];
    const dx = ((cell.x - rx) / FW) * 100;
    const dy = ((cell.y - ry) / FH) * 100;
    const [t, r, b, l] = cell.outer ?? [spec.outer[0] + dy, spec.outer[1] - dx, spec.outer[2] - dy, spec.outer[3] + dx];
    const ow = FW * (1 - (l + r) / 100);
    const oh = FH * (1 - (t + b) / 100);
    const ox = (FW * l) / 100;
    const oy = (FH * t) / 100;
    const [it, ir, ib, il] = spec.inner;
    const w = ow * (1 - (il + ir) / 100);
    const h = oh * (1 - (it + ib) / 100);
    return (
      <View key={`i${cell.icon}`} style={[box(ox, oy, ow, oh), spec.flip ? { transform: [{ scaleX: -1 }] } : null]}>
        <SvgXml xml={svg.icons[cell.icon as string]} width={u(w)} height={u(h)} style={{ position: 'absolute', left: u((ow * il) / 100), top: u((oh * it) / 100) }} />
      </View>
    );
  };

  const fixed = (cell: Cell) => {
    const at = FIXED_AT[cell.icon as Fixed];
    const [fx, fy, size] = at ? [cell.x + at[0], cell.y + at[1], at[2]] : [0, 0, 0];
    switch (cell.icon) {
      case 'car':
        return (
          <View key="car" style={[box(fx, fy, size, size), { overflow: 'hidden' }]}>
            <Image source={tier.art.car} resizeMode="stretch" style={{ position: 'absolute', left: u(-1.37), top: u(9.65), width: u(46.5), height: u(26.02) }} />
            <SvgXml xml={svg.carDetail} width={u(158.22)} height={u(239.14)} style={{ position: 'absolute', left: u(-79.6), top: u(0.6) }} />
          </View>
        );
      case 'tag':
        return <SvgXml key="tag" xml={svg.tag} width={u(29)} height={u(29)} style={box(fx, fy, size, size)} />;
      case 'mystery':
        return (
          <View key="mystery" style={[box(fx, fy, size, size), { overflow: 'hidden' }]}>
            <SvgXml xml={svg.mystery} width={u(112)} height={u(161.47)} style={{ position: 'absolute', left: u(-53.1), top: u(0.35) }} />
          </View>
        );
      case 'nick':
        return <SvgXml key="nick" xml={svg.nick} width={u(25)} height={u(25)} style={box(fx, fy, size, size)} />;
      default:
        return placed(cell);
    }
  };

  const emblemBox = tier.emblemBox ?? EMBLEM_BOX;
  const ramBox = tier.ramBox ?? RAM_BOX;
  const crest = <Image source={tier.art.ram} resizeMode="cover" style={box(...ramBox)} />;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SvgXml xml={BG} width="100%" height="100%" style={StyleSheet.absoluteFill} />
      <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ height: u(FH) }} scrollEnabled={false}>
        {/* 0101 1 — the lit stage. */}
        <Image source={tier.art.top} resizeMode="cover" style={box(-1, 0, 391.14, 459.82)} />

        {/* VIP 5's crest stands behind the panel; every other tier's is drawn last. */}
        {tier.ramBelow ? crest : null}

        {/* Rectangle 161124085, 161124086 and the lip under the emblem. */}
        <LinearGradient
          colors={['#070504', '#241D16', '#42311E', '#543E21', '#523D22', '#443523', '#201C14', '#070403']}
          locations={[0, 0.215, 0.31026, 0.47949, 0.585, 0.69359, 0.82821, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={box(0, 353, 390, 491)}
        />
        <LinearGradient colors={['#1D1815', '#000000']} style={box(15, 364.5, 357, 479.5)} />
        <View style={[box(0, 358, 389.55, 13.005), { transform: [{ rotate: '180deg' }] }]}>
          <SvgXml xml={svg.lip} width={u(499.55)} height={u(214.0)} style={{ position: 'absolute', left: u(-73), top: u(-11) }} />
        </View>
        <Image source={tier.art.emblem} resizeMode="cover" style={box(...emblemBox)} />

        {/* back + title */}
        <Pressable onPress={() => navigation.goBack()} hitSlop={u(10)} accessibilityLabel="Back" style={box(6, 44, 30.3, 30.3)}>
          <SvgXml xml={svg.back} width={u(9.4)} height={u(16.12)} style={{ position: 'absolute', left: u(10.27), top: u(7.1) }} />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[box(93, 50, 204, 24), font(18, 'bold'), { textAlign: 'center' }]}>
          Aristocracy Privileges
        </Text>

        {/* The banner: "Aristocracy Privileges" between its wings, and the count. */}
        <Image source={tier.art.banner} resizeMode="stretch" style={box(...(tier.bannerBox ?? BANNER_BOX))} />
        <Text style={[box(178, 421, 60, 14), font(10, 'medium')]}>{tier.count}</Text>

        {/* The privilege grid. */}
        {tier.cells.map((c) => (
          <View key={c.icon}>
            <SvgXml xml={svg.disc[c.disc]} width={u(49)} height={u(49)} style={box(c.x, c.y, 49, 49)} />
            {fixed(c)}
            <Text numberOfLines={1} style={[{ position: 'absolute', left: u(c.lx), top: u(c.ly) }, font(9, 'regular')]}>{c.label}</Text>
          </View>
        ))}

        {/* 024110610472026794 — the crest standing on the lip. */}
        {tier.ramBelow ? null : crest}

        {/* VIP 1 … VIP 8, drawn last so they sit over the stage. */}
        <ScrollView ref={tabs} horizontal showsHorizontalScrollIndicator={false} style={box(0, 90, 390, 30)} contentContainerStyle={{ width: u(25 + TAB_PITCH * TABS.length) }}>
          {TABS.map((n, i) => (
            <Pressable
              key={n}
              disabled={!TIERS[n]}
              onPress={() => setTierNo(n)}
              hitSlop={u(6)}
              style={{ position: 'absolute', left: u(25 + TAB_PITCH * i - 8), top: 0, width: u(56), height: u(24) }}
            >
              <Text style={[{ position: 'absolute', left: u(8), top: u(7) }, font(11, 'semiBold'), { opacity: tierNo === n ? 1 : 0.5 }]}>{`VIP ${n}`}</Text>
            </Pressable>
          ))}
          <SvgXml xml={vip.underline} width={u(10)} height={u(2)} style={box(TIERS[tierNo].underline - 1, TIERS[tierNo].underlineY ?? 26, 10, 2)} />
        </ScrollView>
      </ScrollView>

      {/* Frame 1857 — price and Become VIP. Figma's numbers are from the bar's outer edge; the 1px border pushes absolute children in, so each is 1 less. */}
      <View style={[styles.bar, { height: u(61), borderTopLeftRadius: u(12), borderTopRightRadius: u(12) }]}>
        <Image source={require('../../assets/vip/coin.png')} resizeMode="cover" style={box(19, 20, 20, 20)} />
        <Text style={[box(45, 23, 100, 14), font(11, 'semiBold', '#FFEBB0')]}>{tier.price}</Text>
        <Pressable
          onPress={() => Alert.alert('VIP', 'Becoming a VIP is not available yet.')}
          style={[box(264, 13, 107, 33), { borderRadius: u(22), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}
        >
          <LinearGradient colors={['#FFFFFF', '#FFD557']} style={StyleSheet.absoluteFill} />
          <Text style={font(11, 'bold', '#594405')}>{`Become VIP ${tierNo}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#060606' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#131313',
    borderWidth: 1,
    borderColor: 'rgba(63,63,63,0.3)',
  },
});
