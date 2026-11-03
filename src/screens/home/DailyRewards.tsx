import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { REWARDS } from './geometry';

/**
 * Daily Rewards — node 483:2995, over a 49% black scrim.
 *
 * Drawn inside the home screen rather than as a native Modal: Figma keeps the
 * bottom bar above the scrim, and TabShell draws the bar above every screen.
 * The week comes from GET /checkin, i.e. whatever the admin panel's Daily rewards
 * page defines: coins, diamonds, or a store item (frame, entry effect...).
 */

const art = {
  ribbon: require('../../assets/home/rewards-ribbon.png'),
  coins: require('../../assets/home/reward-coins.png'),
  coin: require('../../assets/home/reward-coin.png'),
  diamonds: require('../../assets/home/reward-diamonds.png'),
  diamond: require('../../assets/home/reward-diamond.png'),
};

/** Coins and diamonds use bundled art; every cosmetic shows the image the Store item carries. */
const artOf = (d: CheckinDay) => {
  if (d.status === 'unavailable') return null;
  if (d.item) return d.item.image_url ? { uri: d.item.image_url } : null;
  return d.reward_type === 'diamonds' ? art.diamonds : art.coins;
};

const TYPE_NAMES: Record<string, string> = {
  frame: 'Frame',
  bubble: 'Chat Bubble',
  entrance_effect: 'Entry effect',
  entry_banner: 'Entry banner',
  profile_card: 'Profile card',
  mic_wave: 'Mic wave',
  room_background: 'Room bg',
  floating_screen: 'Floating screen',
};

export type CheckinItem = { id: number; type: string; name: string; image_url: string | null };

export type CheckinDay = {
  day: number;
  reward_type: string | null;
  reward_value: number | null;
  duration_days?: number | null;
  /** Set when the day pays a store item (frame, entry effect...) instead of currency. */
  item?: CheckinItem | null;
  status: 'claimed' | 'today' | 'locked' | 'unavailable';
};

const unitOf = (type: string | null) => (type === 'diamonds' ? 'Diamond' : 'coins');
const spanOf = (days?: number | null) => (days ? `${days}d` : 'Forever');

const labelOf = (d: CheckinDay) => {
  if (d.status === 'unavailable') return 'Coming soon';
  if (d.item) return `${TYPE_NAMES[d.item.type] ?? d.item.name}${d.duration_days ? ` ${d.duration_days}d` : ''}`;
  return d.reward_value == null ? 'Reward' : `${d.reward_value} ${unitOf(d.reward_type)}`;
};

type Won = { reward_type: string; reward_value: number; duration_days?: number | null; item?: CheckinItem | null };
const wonText = (w: Won) => {
  if (w.item) return `${w.item.name} · ${spanOf(w.duration_days)}`;
  return `+${w.reward_value} ${unitOf(w.reward_type)}`;
};

/** Coins that fly out of the Collect button when the reward is taken. */
function CoinBurst({ run, size }: { run: number; size: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [run, t]);
  if (!run) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (Math.PI * (i + 0.5)) / 14 + Math.PI;
        const dist = size * (2.2 + (i % 3) * 0.7);
        return (
          <Animated.Image
            key={i}
            source={art.coin}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist * 1.2 + dist * 0.5] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 360}deg`] }) },
                { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.2, 0.8] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

export default function DailyRewards({
  week,
  onClaim,
  onClose,
}: {
  week: CheckinDay[];
  /** Resolves with the reward just paid, or null when the claim failed. */
  onClaim: () => Promise<Won | null>;
  onClose: () => void;
}) {
  const { px } = useDesignScale();
  const [days, setDays] = useState(week);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<Won | null>(null);
  const [burst, setBurst] = useState(0);
  const pop = useRef(new Animated.Value(0)).current;
  const claimed = days.every((x) => x.status !== 'today');

  const collect = async () => {
    if (busy || won) return;
    if (claimed) return onClose();
    setBusy(true);
    const got = await onClaim();
    setBusy(false);
    if (!got) return onClose();
    setWon(got);
    setBurst((n) => n + 1);
    setDays((list) => list.map((x) => (x.status === 'today' ? { ...x, status: 'claimed' } : x)));
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    setTimeout(onClose, 2200);
  };

  const { ribbon, title, card, wash, subtitle, grid, tile, collect: box } = REWARDS;
  const inner = { width: card.width - card.stroke * 2, height: card.height - card.stroke * 2 };
  const gridLeft = (inner.width - grid.width) / 2;

  return (
    <View style={[StyleSheet.absoluteFill, styles.scrim]}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <View
        style={{
          width: px(REWARDS.width),
          height: px(REWARDS.height),
          transform: [{ translateY: px(REWARDS.centerOffset) }],
        }}
      >
        {/* The stroke is the gradient showing round a white card inset by 5px. */}
        <LinearGradient
          colors={[colors.white, colors.rewardOrange]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            top: px(card.y),
            width: px(card.width),
            height: px(card.height),
            borderRadius: px(card.radius),
            overflow: 'hidden',
          }}
        />
        <View
          style={[
            styles.card,
            {
              left: px(card.stroke),
              top: px(card.y + card.stroke),
              width: px(inner.width),
              height: px(inner.height),
              borderRadius: px(card.radius - card.stroke),
            },
          ]}
        >
          <LinearGradient
            colors={colors.rewardWash}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: px(wash.x),
              top: px(wash.y),
              width: px(wash.width),
              height: px(wash.height),
            }}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                { top: px(subtitle.y), fontSize: px(subtitle.size), lineHeight: px(subtitle.height) },
              ]}
            >
              Sign in for 7 days for rich rewards
            </Text>
          </LinearGradient>

          {days.map((reward, index) => {
            const wide = reward.day === 7;
            const column = wide ? 0 : index % 3;
            const row = wide ? 2 : Math.floor(index / 3);
            const width = wide ? grid.width : tile.width;
            const isToday = reward.status === 'today';
            const isClaimed = reward.status === 'claimed';
            return (
              <View
                key={reward.day}
                style={[
                  styles.tile,
                  {
                    left: px(gridLeft + column * (tile.width + grid.columnGap)),
                    top: px(grid.y + row * (tile.height + grid.rowGap)),
                    width: px(width),
                    height: px(tile.height),
                    borderRadius: px(tile.radius),
                    borderWidth: tile.border,
                  },
                  isToday && styles.today,
                ]}
              >
                <Text style={[styles.dayText, { fontSize: px(10), top: px(3), left: px(6) }]}>Day {reward.day}</Text>
                <View
                  style={{
                    position: 'absolute',
                    left: px(wide ? (width - tile.coins.width) / 2 : tile.coins.x),
                    top: px(tile.coins.y),
                    width: px(tile.coins.width),
                    height: px(tile.coins.height),
                    overflow: 'hidden',
                  }}
                >
                  {(() => {
                    const source = artOf(reward);
                    if (!source) return null;
                    const isCoins = source === art.coins;
                    return (
                      <Image
                        source={source}
                        resizeMode="contain"
                        style={
                          isCoins
                            ? { position: 'absolute', left: px(tile.coins.imageX), width: px(tile.coins.imageWidth), height: px(tile.coins.height) }
                            : { position: 'absolute', left: px(tile.coins.width * 0.1), top: px(-8), width: px(tile.coins.width * 0.8), height: px(tile.coins.height + 14) }
                        }
                      />
                    );
                  })()}
                </View>
                <View style={[styles.band, { left: px(tile.band.x), top: px(tile.band.y), width: px(width), height: px(tile.band.height) }]} />
                <View style={[styles.label, { top: px(tile.label.y), gap: px(tile.label.gap) }]}>
                  {reward.item || reward.status === 'unavailable' ? null : (
                    <Image
                      source={reward.reward_type === 'diamonds' ? art.diamond : art.coin}
                      resizeMode="contain"
                      style={{ width: px(tile.label.coin), height: px(tile.label.coin) }}
                    />
                  )}
                  <Text numberOfLines={1} style={[styles.labelText, { fontSize: px(reward.reward_type === 'diamonds' ? tile.label.size - 1 : tile.label.size), lineHeight: px(tile.label.height) }]}>
                    {labelOf(reward)}
                  </Text>
                </View>
                {isClaimed ? (
                  // A day already taken: dimmed, with a green tick over it.
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
                    <View style={{ width: px(30), height: px(30), borderRadius: px(15), backgroundColor: '#2FBF5B', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: px(18), lineHeight: px(22), fontFamily: typography.fontFamily.medium }}>✓</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Pressable
            onPress={collect}
            style={[
              styles.collect,
              {
                left: px((inner.width - box.width) / 2),
                top: px(box.y),
                width: px(box.width),
                height: px(box.height),
                borderRadius: px(box.radius),
                opacity: claimed && !won ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.collectLabel, { fontSize: px(box.size), lineHeight: px(box.lineHeight) }]}>
              {won ? 'Collected!' : claimed ? 'Come back tomorrow' : busy ? '...' : 'Collect'}
            </Text>
          </Pressable>

          <View style={{ position: 'absolute', left: px(inner.width / 2), top: px(box.y + box.height / 2) }}>
            <CoinBurst run={burst} size={px(22)} />
          </View>
          {won ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: px(box.y - 54),
                alignItems: 'center',
                opacity: pop,
                transform: [
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                ],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), paddingHorizontal: px(16), paddingVertical: px(6), borderRadius: px(20), backgroundColor: colors.rewardOrange }}>
                {won.item ? null : (
                  <Image
                    source={won.reward_type === 'diamonds' ? art.diamond : art.coin}
                    resizeMode="contain"
                    style={{ width: px(20), height: px(20) }}
                  />
                )}
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(18), color: colors.white }}>
                  {wonText(won)}
                </Text>
              </View>
            </Animated.View>
          ) : null}
        </View>

        {/* Group 1597881077 — the winged ribbon crowning the card, title on it. */}
        <View
          style={{
            position: 'absolute',
            left: px(ribbon.x),
            top: px(ribbon.y),
            width: px(ribbon.width),
            height: px(ribbon.height),
            overflow: 'hidden',
          }}
        >
          <Image
            source={art.ribbon}
            style={{
              position: 'absolute',
              left: px(ribbon.image.x),
              top: px(ribbon.image.y),
              width: px(ribbon.image.width),
              height: px(ribbon.image.height),
            }}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              top: px(title.y),
              left: px(title.centerOffset * 2),
              fontSize: px(title.size),
              lineHeight: px(title.height),
            },
          ]}
        >
          Daily Rewards
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: colors.rewardScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  subtitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: typography.fontFamily.regular,
    color: colors.rewardOrange,
    textAlign: 'center',
  },
  tile: {
    position: 'absolute',
    borderColor: colors.rewardTileBorder,
    overflow: 'hidden',
  },
  today: {
    backgroundColor: colors.rewardToday,
    borderColor: colors.rewardOrange,
    borderWidth: 2,
  },
  dayText: {
    position: 'absolute',
    zIndex: 2,
    fontFamily: typography.fontFamily.medium,
    color: '#B07A2A',
  },
  band: {
    position: 'absolute',
    backgroundColor: colors.rewardOrange,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
  },
  collect: {
    position: 'absolute',
    backgroundColor: colors.rewardYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  title: {
    position: 'absolute',
    right: 0,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    textAlign: 'center',
  },
});
