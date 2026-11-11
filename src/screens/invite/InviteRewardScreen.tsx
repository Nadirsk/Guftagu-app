import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import * as settingsIcons from '../../assets/settings/icons';
import { useDesignScale } from '../../theme/layout';
import { typography } from '../../theme/tokens';

/**
 * Invitation Reward (Figma 2015:9706, a 440 x 3789 frame, so every figure is scaled by 402 / 440).
 * The server has no invitation programme yet: the tiers and their 1000-diamond slots are the design's
 * own, and the record reads 0.
 */

const FRAME = 440;
const BROWN = '#521B03';
const GOLD_EDGE = '#FFA44A';
const ORANGE_TEXT = '#FF8B25';
const HEIGHT = 3789;

const art = {
  banner: require('../../assets/invite/banner.png'),
  title: require('../../assets/invite/title.png'),
  rules: require('../../assets/invite/rules-frame.png'),
  ribbon: require('../../assets/invite/ribbon.png'),
  card: require('../../assets/invite/card-frame.png'),
  barTitle: require('../../assets/invite/bar-title.png'),
  barPrice: require('../../assets/invite/bar-price.png'),
  gem: require('../../assets/invite/gem.png'),
};

// Section tops (the title bar's y), their title and the diamonds the tier pays.
const TIERS = [
  { y: 1151, title: 'Invite up to 2 friends', pays: '5500' },
  { y: 1569, title: 'Invite up to 2 friends', pays: '5500' },
  { y: 1987, title: 'Invite up to 3-5 friends', pays: '7000' },
  { y: 2394, title: 'Invite up to 6+ friends', pays: '7000' },
] as const;
const SLOT_X = [42, 167, 292] as const; // 42, 40% - 9, 60% + 28

export default function InviteRewardScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();

  const u = (v: number) => px((v * 402) / FRAME);
  const box = (left: number, top: number, w: number, h: number) => ({ position: 'absolute' as const, left: u(left), top: u(top), width: u(w), height: u(h) });
  const font = (size: number, weight: 'regular' | 'medium' | 'semiBold' | 'bold', color = '#FFFFFF') => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: u(size),
    lineHeight: u(Math.round(size * 1.28)),
    color,
  });
  /** Text centred on x. */
  const centred = (cx: number, top: number, width = 200) => ({ position: 'absolute' as const, left: u(cx - width / 2), top: u(top), width: u(width), textAlign: 'center' as const });

  /** An image drawn into a box at a percentage size and offset (Figma's cropped fills). */
  const crop = (src: ImageSourcePropType, l: number, t: number, w: number, h: number, p: { w: number; h: number; l: number; t: number }, key?: string, children?: ReactNode) => (
    <View key={key} style={[box(l, t, w, h), { overflow: 'hidden' }]}>
      <Image source={src} resizeMode="stretch" style={{ position: 'absolute', left: u(p.l * w), top: u(p.t * h), width: u(p.w * w), height: u(p.h * h) }} />
      {children}
    </View>
  );
  const FRAME_CROP = { w: 1.1083, h: 1.0475, l: -0.0631, t: -0.0158 };
  const TITLE_BAR = { w: 1.6514, h: 8.2759, l: -0.3234, t: -3.7356 };
  const PRICE_BAR = { w: 1.2564, h: 3.1111, l: -0.1154, t: -1.0476 };

  const gem = (left: number, top: number) => (
    <View style={[box(left, top, 23, 19), { overflow: 'hidden' }]}>
      <Image source={art.gem} resizeMode="stretch" style={{ position: 'absolute', left: u(-0.0899 * 23), top: 0, width: u(1.0317 * 23), height: u(19) }} />
    </View>
  );

  /** A 110 x 142 slot: brown-to-rust gradient, a gold edge and the diamond count at the top. */
  const slot = (x: number, y: number, key: string, value: string, label?: ReactNode) => (
    <View key={key} style={[box(x, y, 110, 142), { borderRadius: u(9), borderWidth: Math.max(1, u(3)), borderColor: GOLD_EDGE, overflow: 'hidden' }]}>
      <LinearGradient colors={['#B84411', '#5D4E3F', '#842800']} locations={[0, 0.524, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: u(21) - Math.max(1, u(3)), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: u(2) }}>
        <View style={{ width: u(23), height: u(19), overflow: 'hidden' }}>
          <Image source={art.gem} resizeMode="stretch" style={{ position: 'absolute', left: u(-0.0899 * 23), top: 0, width: u(1.0317 * 23), height: u(19) }} />
        </View>
        <Text style={font(15, 'semiBold')}>{value}</Text>
      </View>
      {label}
    </View>
  );

  const titleBar = (y: number, text: string) => (
    <View key={`t${y}`}>
      {crop(art.barTitle, 79, y, 277, 55, TITLE_BAR)}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[centred(219.5, y + 17, 143), font(15, 'semiBold')]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={{ height: u(HEIGHT) }} showsVerticalScrollIndicator={false}>
        {/* Rectangle 55 + the brown field under it. */}
        <Image source={art.banner} resizeMode="cover" style={box(0, 123, 440, 478)} />
        <View style={[box(0, 595, 440, 3189), { backgroundColor: BROWN }]} />

        {/* chevron_backward + title */}
        <Pressable onPress={() => navigation.goBack()} hitSlop={u(12)} accessibilityLabel="Back" style={box(15, 74, 30, 30)}>
          <SvgXml xml={settingsIcons.chevronForward} width={u(24)} height={u(24)} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={[{ position: 'absolute', left: 0, width: u(292), top: u(76), textAlign: 'right' }, font(18, 'medium', '#000000')]}>Invitation Reward</Text>

        {/* image 205688 + its heading */}
        <Image source={art.title} resizeMode="cover" style={box(43.5, 148, 353, 123)} />
        <Text style={[centred(220.5, 203, 330), font(18, 'bold')]}>Invitation Reward</Text>

        {/* Invite Rules */}
        {crop(art.rules, 15, 625, 406, 501, { w: 1.5805, h: 1.0148, l: -0.2701, t: 0 })}
        {crop(art.ribbon, 101, 640, 240.45, 72, { w: 1, h: 2.5283, l: 0, t: -0.7358 })}
        <Text style={[centred(222.5, 671, 200), font(15, 'semiBold')]}>Invite Rules</Text>

        {/* The four invitation tiers. */}
        {TIERS.map((t, i) => (
          <View key={i}>
            {crop(art.card, -7, t.y + 5, 459, 379, FRAME_CROP)}
            {titleBar(t.y, t.title)}
            {crop(art.barPrice, 133, t.y + 70, 175, 58, PRICE_BAR)}
            {gem(133 + 55, t.y + 70 + 21)}
            <Text style={[box(133 + 55 + 25, t.y + 70 + 21, 60, 19), font(15, 'semiBold')]}>{t.pays}</Text>
            {SLOT_X.map((x) => slot(x, t.y + 166, `${i}-${x}`, '1000'))}
          </View>
        ))}

        {/* Invitation Record */}
        {crop(art.card, -7, 2817, 459, 425, FRAME_CROP)}
        {titleBar(2812, 'Invitation Record')}
        {crop(art.barPrice, 133, 2882, 175, 58, PRICE_BAR)}
        <Text style={[box(133 + 85, 2882 + 21, 40, 19), font(15, 'semiBold')]}>0</Text>
        <Text style={[centred(223, 2947.5, 240), font(15, 'medium')]}>Successful invitation</Text>
        {slot(97, 3000, 'r1', '0', <Text style={[centred(55 - 3, 99 - 8, 100), font(13, 'regular', ORANGE_TEXT)]}>Rewards Received</Text>)}
        {slot(242, 3000, 'r2', '0', <Text style={[centred(55 - 3, 99 - 16, 100), font(13, 'regular', ORANGE_TEXT)]}>{'Unclaimed \nEarning'}</Text>)}

        {/* Rectangle — Withdrawal Diamonds. */}
        <Pressable
          onPress={() => Alert.alert('Withdrawal', 'Withdrawing invitation diamonds is not available yet.')}
          style={[box(130, 3269, 180, 41), styles.withdraw, { borderRadius: u(12), borderWidth: 1, borderColor: '#FFFFFF' }]}
        >
          <LinearGradient colors={['#FF5700', '#EF5200']} style={[StyleSheet.absoluteFill, { borderRadius: u(12) }]} />
          <Text style={font(13, 'medium')}>Withdrawal Diamonds</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  withdraw: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5800',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
