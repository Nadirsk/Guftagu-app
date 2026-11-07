import { Image, Platform, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import type { LevelKind } from './geometry';
import { bandFor, LABEL_LEFT, MEDAL_ASPECT, MEDAL_H, MEDAL_W, PLAIN_MEDALS } from './medals';

/**
 * A user's wealth or charm grade medal with their exact level on it: the band's medal
 * (Lv.1–10, Lv.11–20 …) with its printed label painted out, and "LV.n" set where that
 * label was — same white serif, same left edge. `height` is in design pixels.
 */
export function LevelBadge({ kind, level, height }: { kind: LevelKind; level: number | null | undefined; height: number }) {
  const { px } = useDesignScale();
  const band = bandFor(kind, level);
  const scale = height / MEDAL_H;
  const left = LABEL_LEFT[kind][band] * scale;

  return (
    <View style={{ width: px(height * MEDAL_ASPECT), height: px(height) }}>
      <Image
        source={PLAIN_MEDALS[kind][band]}
        resizeMode="contain"
        style={{ position: 'absolute', left: 0, top: 0, width: px(height * MEDAL_ASPECT), height: px(height) }}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          position: 'absolute',
          left: px(left),
          width: px((MEDAL_W - 6) * scale - left),
          top: 0,
          height: px(height),
          // The printed labels are a condensed serif; this wider one is set a little
          // smaller so "LV.120" still fits the pill.
          fontSize: px(height * 0.42),
          lineHeight: px(height),
          includeFontPadding: false,
          textAlignVertical: 'center',
          color: '#FFFFFF',
          // Lining figures, like the printed labels (Georgia's old-style 9 drops below the line).
          fontFamily: Platform.select({ ios: 'TimesNewRomanPS-BoldMT', android: 'serif', default: '"Times New Roman", serif' }),
          fontWeight: '700',
          textShadowColor: 'rgba(0,0,0,0.45)',
          textShadowOffset: { width: 0, height: px(1) },
          textShadowRadius: px(1),
        }}
      >
        {`LV.${level ?? 0}`}
      </Text>
    </View>
  );
}

/**
 * The size the medals are readable at from arm's length — Post Details' comment rows,
 * the 92x16 strip slot the medals replaced. Use it unless a row truly has no room.
 */
export const READABLE_BADGE_HEIGHT = (92 * 16) / 73;

/** Anyone the API describes with `SocialPresenter::user()` carries both numbers. */
export type LevelHolder = { wealth_level?: number | null; charm_level?: number | null } | null | undefined;

/**
 * The wealth medal then the charm medal, side by side — what replaced the static grey
 * pill + green heart strip next to a name (room chat, moments, comments, likes).
 */
export function LevelBadges({ user, height, gap = 4 }: { user: LevelHolder; height: number; gap?: number }) {
  const { px } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', gap: px(gap) }}>
      <LevelBadge kind="wealth" level={user?.wealth_level} height={height} />
      <LevelBadge kind="charm" level={user?.charm_level} height={height} />
    </View>
  );
}
