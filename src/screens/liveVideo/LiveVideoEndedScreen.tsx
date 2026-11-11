import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { chevronLeft, useUi } from './parts';

/**
 * "Your live broadcast room has been ended" (Figma 2015:8140): the host's picture on top and a Live data
 * card — earnings, audience and new followers, which are all 0 until a video-room backend counts them.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LiveVideoEndedScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'LiveVideoEnded'>>();
  const { user } = useAuth();
  const photo = params.cover ?? user?.avatar_url ?? null;

  const stat = (left: number, top: number, value: number, label: string) => (
    <View style={[at(left, top), { width: px(51), alignItems: 'center' }]}>
      <Text style={[text(13, 'medium', colors.white), { textAlign: 'center' }]}>{value}</Text>
      <Text style={[text(13, 'medium', colors.white), { width: px(80), textAlign: 'center' }]}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* Rectangle 161124144 — 416 x 232, the host's picture. */}
      <View style={[at(-7, 0), { width: px(416), height: px(232), backgroundColor: '#1b1b1b', overflow: 'hidden' }]}>
        {photo ? <Image source={{ uri: photo }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
      </View>
      <Pressable onPress={() => navigation.popToTop()} accessibilityLabel="Back" hitSlop={px(10)} style={[at(22, 52), { width: px(28), height: px(28) }]}>
        <SvgXml xml={chevronLeft('#FFFFFF')} width={px(28)} height={px(28)} />
      </Pressable>

      <Text style={[at(0, 260), { width: '100%', textAlign: 'center' }, text(15, 'medium', colors.white)]}>Your live broadcast room has been ended</Text>

      {/* Frame 1597881880 — Live data. */}
      <View style={[at(21, 319), { width: px(358), height: px(212), borderRadius: px(12), backgroundColor: 'rgba(255,255,255,0.08)' }]}>
        <Text style={[at(20, 25), text(15, 'medium', colors.white)]}>Live data</Text>
        {stat(20, 83, 0, 'Earnings')}
        {stat(172, 83, params.audience, 'Audience')}
        {stat(20, 152, 0, 'Followers')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
});
