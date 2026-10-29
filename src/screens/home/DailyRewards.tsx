import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { REWARDS } from './geometry';

/**
 * Daily Rewards — node 483:2995, over a 49% black scrim.
 *
 * Drawn inside the home screen rather than as a native Modal: Figma keeps the
 * bottom bar above the scrim, and TabShell draws the bar above every screen.
 * There is no rewards API yet, so the six rewards are the frame's own and the
 * first is the one on offer; Collect only dismisses it for the day.
 */

const art = {
  ribbon: require('../../assets/home/rewards-ribbon.png'),
  coins: require('../../assets/home/reward-coins.png'),
  coin: require('../../assets/home/reward-coin.png'),
};

type Reward = { label: string; coins: boolean };

// Frames 1597881084 / 1597881101 / 1597881100, then 1597881106-8, in reading order.
const DAYS: Reward[] = [
  { label: '100 coins', coins: true },
  { label: '200 coins', coins: true },
  { label: '200 coins', coins: true },
  { label: 'Chat Bubble', coins: false },
  { label: '300 coins', coins: true },
  { label: 'Entry effect', coins: false },
];

const TODAY = 0;

export default function DailyRewards({ onCollect }: { onCollect: () => void }) {
  const { px } = useDesignScale();
  const { ribbon, title, card, wash, subtitle, grid, tile, collect } = REWARDS;
  const inner = { width: card.width - card.stroke * 2, height: card.height - card.stroke * 2 };
  const gridLeft = (inner.width - grid.width) / 2;

  return (
    <View style={[StyleSheet.absoluteFill, styles.scrim]}>
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

          {DAYS.map((reward, index) => {
            const column = index % 3;
            const row = Math.floor(index / 3);
            return (
              <View
                key={index}
                style={[
                  styles.tile,
                  {
                    left: px(gridLeft + column * (tile.width + grid.columnGap)),
                    top: px(grid.y + row * (tile.height + grid.rowGap)),
                    width: px(tile.width),
                    height: px(tile.height),
                    borderRadius: px(tile.radius),
                    borderWidth: tile.border,
                  },
                  index === TODAY && styles.today,
                ]}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: px(tile.coins.x),
                    top: px(tile.coins.y),
                    width: px(tile.coins.width),
                    height: px(tile.coins.height),
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={art.coins}
                    style={{
                      position: 'absolute',
                      left: px(tile.coins.imageX),
                      width: px(tile.coins.imageWidth),
                      height: px(tile.coins.height),
                    }}
                  />
                </View>
                <View
                  style={[
                    styles.band,
                    {
                      left: px(tile.band.x),
                      top: px(tile.band.y),
                      width: px(tile.band.width),
                      height: px(tile.band.height),
                    },
                  ]}
                />
                <View style={[styles.label, { top: px(tile.label.y), gap: px(tile.label.gap) }]}>
                  {reward.coins ? (
                    <Image
                      source={art.coin}
                      style={{ width: px(tile.label.coin), height: px(tile.label.coin) }}
                    />
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.labelText,
                      { fontSize: px(tile.label.size), lineHeight: px(tile.label.height) },
                    ]}
                  >
                    {reward.label}
                  </Text>
                </View>
              </View>
            );
          })}

          <Pressable
            onPress={onCollect}
            style={[
              styles.collect,
              {
                left: px((inner.width - collect.width) / 2),
                top: px(collect.y),
                width: px(collect.width),
                height: px(collect.height),
                borderRadius: px(collect.radius),
              },
            ]}
          >
            <Text
              style={[styles.collectLabel, { fontSize: px(collect.size), lineHeight: px(collect.lineHeight) }]}
            >
              Collect
            </Text>
          </Pressable>
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
