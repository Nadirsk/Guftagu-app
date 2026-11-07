import { useNavigation } from '@react-navigation/native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as settingsIcons from '../../assets/settings/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/** Personal Medal rule (Figma 573:2638, 402 x 874): the banner and the two rules. */

const BANNER = require('../../assets/medals/rule-banner.png');
const TITLE_BROWN = '#360808'; // "Personal Medal rule" over the banner
const SECTIONS = [
  ['1.Wear Medal', 'All the medals can be worn. You can wear up to 3 badges at the same time. If less than 3 medals are currently being worn, medals will be worn automatically when you get them. Each achievement medal has up to 6 levels from low to high'],
  ['2.Honor Medal', 'The honor medal are award to eligible users on the every sunday and is valid for about one week.'],
] as const;

export default function MedalRuleScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <Image source={BANNER} resizeMode="cover" style={{ position: 'absolute', left: 0, top: px(88), width: px(402), height: px(898) }} />

      {/* Frame 1597881566 — arrow-left-normal + title. */}
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} accessibilityLabel="Back" style={{ position: 'absolute', left: px(15), top: px(44), width: px(34), height: px(34) }}>
        <SvgXml xml={settingsIcons.arrowLeft} width={px(34)} height={px(34)} />
      </Pressable>
      <Text style={{ position: 'absolute', left: px(113), top: px(48.5), fontFamily: typography.fontFamily.medium, fontSize: px(20), lineHeight: px(25), color: colors.black }}>
        Personal Medal rule
      </Text>

      {/* The banner's own heading (Noto Sans Kannada UI Black in the design). */}
      <Text style={{ position: 'absolute', left: px(32), top: px(180), fontFamily: typography.fontFamily.bold, fontSize: px(32), lineHeight: px(44), color: TITLE_BROWN }}>
        {'Personal\nMedal rule'}
      </Text>

      {/* Frame 1597881565 — the rules. */}
      <View style={{ position: 'absolute', left: px(15), top: px(385), width: px(354), gap: px(34) }}>
        {SECTIONS.map(([heading, body]) => (
          <View key={heading} style={{ gap: px(13) }}>
            <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(17), lineHeight: px(22), color: colors.black }}>{heading}</Text>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(16), lineHeight: px(20), color: colors.black, opacity: 0.4 }}>{body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
