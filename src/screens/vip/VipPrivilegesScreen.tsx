import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as vip from '../../assets/vip/icons';
import { useDesignScale } from '../../theme/layout';
import { typography } from '../../theme/tokens';

/**
 * Aristocracy Privileges (Figma 176:1116: VIP 1 is 176:1716, VIP 2 176:1865 …, 390 x 844, so every
 * figure is scaled by 402 / 390). One layout, one table per tier: its stage art, its price, and which
 * privileges it lists and where. The icons are the green VIP 1 vectors turned to the tier's hue
 * (`hue` degrees), which is how Figma recolours them; the stage art and emblems are the tier's own.
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

type Cell = { icon: Key; x: number; y: number; label: string; lx: number; ly: number; disc: 'a' | 'b'; card?: Box };
type Tier = {
  hue: number;
  /** How much more saturated the tier's colours are than VIP 1's muted green (1 = the same). */
  sat: number;
  price: string;
  count: string;
  underline: number;
  art: { top: ImageSourcePropType; emblem: ImageSourcePropType; ram: ImageSourcePropType; car: ImageSourcePropType; banner: ImageSourcePropType };
  cells: Cell[];
};

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
      { icon: 'card', x: 281, y: 550, label: 'Profile Card', lx: 280, ly: 604, disc: 'a', card: [66.82, 18.08, 30.58, 73.19] },
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
      { icon: 'card', x: 281, y: 550, label: 'Profile Card', lx: 284, ly: 604, disc: 'a', card: [66.82, 18.08, 30.58, 73.19] },
      { icon: 'tag', x: 58, y: 644, label: 'VIP tag', lx: 67, ly: 698, disc: 'a' },
      { icon: 'entry', x: 172, y: 644, label: ' Exclusive Entry effect', lx: 148, ly: 698, disc: 'b' },
      { icon: 'gift', x: 287, y: 644, label: 'VIP gift', lx: 297, ly: 698, disc: 'a' },
      { icon: 'hidden', x: 54, y: 738, label: 'Hidden', lx: 59, ly: 792, disc: 'a' },
      { icon: 'mystery', x: 173, y: 738, label: 'Mystery man..', lx: 165, ly: 792, disc: 'b' },
      { icon: 'nick', x: 287, y: 738, label: 'Colorful nick...', lx: 281, ly: 792, disc: 'a' },
    ],
  },
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

  const svg = useMemo(() => {
    const t = (xml: string) => tint(xml, tier.hue, tier.sat);
    return {
      lip: t(vip.lip),
      disc: { a: t(vip.discA), b: t(vip.discB) },
      back: vip.back,
      icons: Object.fromEntries(Object.entries(INSET).map(([k, v]) => [k, t(v.xml)])) as Record<string, string>,
      tag: t(vip.tag),
      mystery: t(vip.mystery),
      nick: t(vip.nick),
      carDetail: t(vip.carDetail),
    };
  }, [tier.hue, tier.sat]);

  /** Figma's inset(…%) of the frame, then the svg's own overflow inset(…%) of that box. */
  const placed = (cell: Cell) => {
    const spec = INSET[cell.icon as string];
    const [t, r, b, l] = cell.card ?? spec.outer;
    const ow = FW * (1 - (l + r) / 100);
    const oh = FH * (1 - (t + b) / 100);
    const ox = (FW * l) / 100;
    const oy = (FH * t) / 100;
    const [it, ir, ib, il] = spec.inner;
    const w = ow * (1 - (il + ir) / 100);
    const h = oh * (1 - (it + ib) / 100);
    return (
      <View key={`i${cell.label}`} style={[box(ox, oy, ow, oh), spec.flip ? { transform: [{ scaleX: -1 }] } : null]}>
        <SvgXml xml={svg.icons[cell.icon as string]} width={u(w)} height={u(h)} style={{ position: 'absolute', left: u((ow * il) / 100), top: u((oh * it) / 100) }} />
      </View>
    );
  };

  const fixed = (cell: Cell) => {
    switch (cell.icon) {
      case 'car':
        return (
          <View key="car" style={[box(292, 461, 39, 39), { overflow: 'hidden' }]}>
            <Image source={tier.art.car} resizeMode="stretch" style={{ position: 'absolute', left: u(-1.37), top: u(9.65), width: u(46.5), height: u(26.02) }} />
            <SvgXml xml={svg.carDetail} width={u(158.22)} height={u(239.14)} style={{ position: 'absolute', left: u(-79.6), top: u(0.6) }} />
          </View>
        );
      case 'tag':
        return <SvgXml key="tag" xml={svg.tag} width={u(29)} height={u(29)} style={box(68, 654, 29, 29)} />;
      case 'mystery':
        return (
          <View key="mystery" style={[box(181, 747, 32, 32), { overflow: 'hidden' }]}>
            <SvgXml xml={svg.mystery} width={u(112)} height={u(161.47)} style={{ position: 'absolute', left: u(-53.1), top: u(0.35) }} />
          </View>
        );
      case 'nick':
        return <SvgXml key="nick" xml={svg.nick} width={u(25)} height={u(25)} style={box(301, 750, 25, 25)} />;
      default:
        return placed(cell);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SvgXml xml={BG} width="100%" height="100%" style={StyleSheet.absoluteFill} />
      <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ height: u(FH) }} scrollEnabled={false}>
        {/* 0101 1 — the lit stage. */}
        <Image source={tier.art.top} resizeMode="cover" style={box(-1, 0, 391.14, 459.82)} />

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
        <Image source={tier.art.emblem} resizeMode="cover" style={box(93, 259, 200, 200)} />

        {/* back + title */}
        <Pressable onPress={() => navigation.goBack()} hitSlop={u(10)} accessibilityLabel="Back" style={box(6, 44, 30.3, 30.3)}>
          <SvgXml xml={svg.back} width={u(9.4)} height={u(16.12)} style={{ position: 'absolute', left: u(10.27), top: u(7.1) }} />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[box(93, 50, 204, 24), font(18, 'bold'), { textAlign: 'center' }]}>
          Aristocracy Privileges
        </Text>

        {/* The banner: "Aristocracy Privileges" between its wings, and the count. */}
        <Image source={tier.art.banner} resizeMode="stretch" style={box(69, 369, 253.33, 60)} />
        <Text style={[box(178, 421, 60, 14), font(10, 'medium')]}>{tier.count}</Text>

        {/* The privilege grid. */}
        {tier.cells.map((c) => (
          <View key={c.label}>
            <SvgXml xml={svg.disc[c.disc]} width={u(49)} height={u(49)} style={box(c.x, c.y, 49, 49)} />
            {fixed(c)}
            <Text numberOfLines={1} style={[{ position: 'absolute', left: u(c.lx), top: u(c.ly) }, font(9, 'regular')]}>{c.label}</Text>
          </View>
        ))}

        {/* 024110610472026794 — the crest standing on the lip. */}
        <Image source={tier.art.ram} resizeMode="cover" style={box(106, 131, 178.66, 171.37)} />

        {/* VIP 1 … VIP 8, drawn last so they sit over the stage. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={box(0, 90, 390, 30)} contentContainerStyle={{ width: u(25 + TAB_PITCH * TABS.length) }}>
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
          <SvgXml xml={vip.underline} width={u(10)} height={u(2)} style={box(TIERS[tierNo].underline - 1, 26, 10, 2)} />
        </ScrollView>
      </ScrollView>

      {/* Frame 1857 — price and Become VIP. */}
      <View style={[styles.bar, { height: u(61), borderTopLeftRadius: u(12), borderTopRightRadius: u(12) }]}>
        <Image source={require('../../assets/vip/coin.png')} resizeMode="cover" style={box(12, 19, 20, 20)} />
        <Text style={[box(46, 24, 100, 14), font(11, 'semiBold', '#FFEBB0')]}>{tier.price}</Text>
        <Pressable
          onPress={() => Alert.alert('VIP', 'Becoming a VIP is not available yet.')}
          style={[box(265, 14, 107, 33), { borderRadius: u(22), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}
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
