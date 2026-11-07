import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as medalIcons from '../../assets/medals/icons';
import * as settingsIcons from '../../assets/settings/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Medals (Figma 560:3303, 402 x 874): the caller's six wearable slots and the
 * Achievement tab. The server serves no medals yet, so every slot shows the design's
 * locked "?" and the Achievement list is empty, as the frame draws it.
 */

const ORANGE = '#FF8B25'; // "Wear Badge"
const RED_ORANGE = '#FF4D00'; // the Achievement underline
const AVATAR = require('../../assets/avatar-placeholder.png');

// Frame 1597881561: three slots a row, 33 wide and 4 apart (37 pitch); rows 24 and 62 under the name.
const SLOT_X = [95.25, 132.25, 169.25] as const;
const SLOT_Y = [162, 200] as const;

export default function MedalsScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });
  const photo = user?.avatar_url ? { uri: user.avatar_url } : AVATAR;

  return (
    <View style={styles.screen}>
      {/* Medals + arrow-left-normal + badge-question-mark */}
      <Text style={[at(170, 62), { fontFamily: typography.fontFamily.medium, fontSize: px(20), lineHeight: px(26), color: colors.black }]}>Medals</Text>
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} accessibilityLabel="Back" style={[at(15, 58), { width: px(34), height: px(34) }]}>
        <SvgXml xml={settingsIcons.arrowLeft} width={px(34)} height={px(34)} />
      </Pressable>
      <Pressable onPress={() => navigation.navigate('MedalRule')} hitSlop={px(10)} accessibilityLabel="Medal rules" style={[at(349, 67), { width: px(24), height: px(24) }]}>
        <SvgXml xml={medalIcons.rulesIcon} width={px(24)} height={px(24)} />
      </Pressable>

      {/* Wear Badge */}
      <View style={[at(241, 141), styles.wear, { width: px(138), height: px(42), borderRadius: px(39) }]}>
        <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(14), lineHeight: px(21), color: ORANGE }}>Wear Badge</Text>
      </View>

      {/* Frame 1597881561 — photo, name and the six slots. */}
      <Image source={photo} style={[at(24, 154.87), { width: px(61.25), height: px(61.25), borderRadius: px(30.6) }]} />
      <Text numberOfLines={1} style={[at(95.25, 138), { width: px(107), fontFamily: typography.fontFamily.medium, fontSize: px(16), lineHeight: px(20), color: colors.black }]}>
        {user?.display_name ?? ''}
      </Text>
      {SLOT_Y.map((y) =>
        SLOT_X.map((x) => (
          <View key={`${x}-${y}`} style={[at(x, y), { width: px(33), height: px(33) }]}>
            <SvgXml xml={medalIcons.slot} width={px(33)} height={px(33)} />
            <SvgXml xml={medalIcons.hexagon} width={px(21)} height={px(22.68)} style={{ position: 'absolute', left: px(6), top: px(6.18) }} />
            <SvgXml xml={medalIcons.star} width={px(15.6)} height={px(15.6)} style={{ position: 'absolute', left: px(8.7), top: px(9.7) }} />
            <Text style={[at(14, 10), { fontFamily: typography.fontFamily.medium, fontSize: px(10), lineHeight: px(15), color: colors.black, opacity: 0.5 }]}>?</Text>
          </View>
        )),
      )}

      {/* Frame 1597881562 — the Achievement tab, with its rule under it. */}
      <Text style={[at(33, 279), { fontFamily: typography.fontFamily.medium, fontSize: px(17), lineHeight: px(22), color: colors.black }]}>Achievement</Text>
      <View style={[at(33, 303), { width: px(78), height: px(4), borderRadius: px(16), backgroundColor: RED_ORANGE }]} />
      <SvgXml xml={medalIcons.rule} width={px(403)} height={px(0.6)} style={{ position: 'absolute', left: px(-0.5), top: px(325) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  wear: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.17)', alignItems: 'center', justifyContent: 'center' },
});
