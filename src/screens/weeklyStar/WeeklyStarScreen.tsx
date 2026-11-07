import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { type Box, CountdownCells, Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import { useCountdown } from '../../hooks/useCountdown';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import {
  BACKDROP,
  BOTTOM_CROP,
  type CardSpec,
  type Crop,
  CUSTOM_ICON,
  EVENT_GIFTS,
  FRAME_HEIGHT,
  ITEM,
  RANKING,
  REWARD_CARD_STEP,
  REWARD_CARDS,
  REWARD_ICON,
  RIBBON,
  RULES_BUTTON,
  RULES_POPUP,
  shiftCard,
  SIDE_CROP,
  TAB,
  TAB_LABEL,
  type TabKey,
  TOP,
} from './geometry';

/**
 * Weekly Star — section 587:5950. Everything comes from `GET /events/{uuid}`:
 * the countdown is the current week's close, Ranking is the event's `board`, and
 * Reward is its rank-range `tiers` and their bundles. The frames are bitmap-heavy,
 * so the screen is laid out on Figma's own coordinates, scaled like every other
 * Guftagu screen, inside one scroll view per tab.
 */

const art = {
  hero: require('../../assets/weekly-star/hero.png'),
  rulesButton: require('../../assets/weekly-star/rules-button.png'),
  rulesPopup: require('../../assets/weekly-star/rules-popup.png'),
  countdownBg: require('../../assets/weekly-star/countdown-bg.png'),
  tabActive: require('../../assets/weekly-star/tab-active.png'),
  // Figma uses a slightly different grey plate for each idle tab.
  tabIdleRanking: require('../../assets/weekly-star/tab-idle-ranking.png'),
  tabIdleReward: require('../../assets/weekly-star/tab-idle-reward.png'),
  cardBg: require('../../assets/weekly-star/card-bg.png'),
  cardFrame: require('../../assets/weekly-star/card-frame.png'),
  ribbon: require('../../assets/weekly-star/title-ribbon.png'),
  itemTile: require('../../assets/weekly-star/item-tile.png'),
  rankingFrame: require('../../assets/weekly-star/ranking-frame.png'),
  rankingFooter: require('../../assets/weekly-star/ranking-footer.png'),
  podium: [
    require('../../assets/weekly-star/top1-frame.png'),
    require('../../assets/weekly-star/top2-frame.png'),
    require('../../assets/weekly-star/top3-frame.png'),
  ],
  scorePill: require('../../assets/weekly-star/score-pill.png'),
  coin: require('../../assets/weekly-star/coin.png'),
  avatar: require('../../assets/avatar-placeholder.png'),
};

const REWARD_ART: Record<string, ImageSourcePropType> = {
  entry_effect: require('../../assets/weekly-star/reward-entry-effect.png'),
  frame: require('../../assets/weekly-star/reward-frame.png'),
  badge: require('../../assets/weekly-star/reward-medal.png'),
  coins: require('../../assets/weekly-star/reward-coins.png'),
  diamonds: require('../../assets/home/reward-diamonds.png'),
};

// `event_gifts` is what the admin picked; only an event that never sends it (the older,
// ranking-rule Weekly Star, or before the event loads) falls back to Figma's samples.
const SAMPLE_GIFTS: EventGift[] = [
  { id: -1, name: '', price: 9999, thumbnail_url: null },
  { id: -2, name: '', price: 8999, thumbnail_url: null },
  { id: -3, name: '', price: 6999, thumbnail_url: null },
];

/** `image_url` is the granted thing's own picture (the frame, the medal…), else null. */
type CatalogItem = { name: string; icon_url: string | null; image_url?: string | null; handler_key: string };
type TierReward = {
  id: number;
  reward_value: number | null;
  duration_days: number | null;
  label: string | null;
  catalog: CatalogItem;
};
type Tier = {
  id: number;
  tier_type: string;
  rank_from: number | null;
  rank_to: number | null;
  label: string | null;
  rewards: TierReward[];
};
type BoardRow = {
  rank: number;
  entity_id: number;
  score: number;
  display_name: string | null;
  avatar_url: string | null;
};
type EventGift = { id: number; name: string; price: number; thumbnail_url: string | null };
type EventSummary = { uuid: string; type: string };
type EventDetail = EventSummary & {
  rules: string[] | string | null;
  cycle_ends_at: string;
  tiers: Tier[];
  board?: BoardRow[];
  event_gifts?: EventGift[];
};

/** 1.15M / 154.2K — the board's scores as Figma prints them. */
function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** "VIP4*7D", "Entry effect", "Frame*7D", "Medal", "Coins*15000". */
function rewardLabel(r: TierReward) {
  if (r.label) return r.label;
  const days = r.duration_days ? `*${r.duration_days}D` : '';
  switch (r.catalog.handler_key) {
    case 'vip':
      return `${r.catalog.name.replace(/\s+/g, '')}${days}`;
    case 'entry_effect':
      return 'Entry effect';
    case 'frame':
      return `Frame${days}`;
    case 'badge':
      return 'Medal';
    case 'coins':
    case 'diamonds':
      return `${r.catalog.name}*${r.reward_value ?? 0}`;
    default:
      return `${r.catalog.name}${days}${r.reward_value ? `*${r.reward_value}` : ''}`;
  }
}

function rulesText(rules: EventDetail['rules'] | undefined) {
  if (Array.isArray(rules) && rules.length) return rules.join('\n');
  if (typeof rules === 'string' && rules.trim()) return rules;
  return RULES_POPUP.fallback;
}

export default function WeeklyStarScreen() {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'WeeklyStar'>>();
  const [tab, setTab] = useState<TabKey>('ranking');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const { secondsLeft, start } = useCountdown();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let uuid = route.params?.uuid;
        if (!uuid) {
          const events = await api<EventSummary[]>('/events', { token });
          uuid = events.find((e) => e.type === 'weekly_star')?.uuid;
        }
        if (!uuid) return;
        const detail = await api<EventDetail>(`/events/${uuid}`, { token });
        if (!live) return;
        setEvent(detail);
        start(Math.max(0, Math.floor((Date.parse(detail.cycle_ends_at) - Date.now()) / 1000)));
      } catch {
        // The art still draws; the board and bundles stay empty until it loads.
      }
    })();
    return () => {
      live = false;
    };
  }, [route.params?.uuid, token, start]);

  const height = FRAME_HEIGHT[tab];

  return (
    <View style={styles.root}>
      <ScrollView style={styles.root} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ height: px(height), overflow: 'hidden' }}>
          {/* The backdrop's stop is a share of the Ranking frame in both tabs, so
              the colour under the tab row doesn't change when switching. */}
          <LinearGradient
            colors={[BACKDROP.from, BACKDROP.to]}
            locations={[0, BACKDROP.stop]}
            style={{ position: 'absolute', left: 0, top: 0, width: px(402), height: px(FRAME_HEIGHT.ranking) }}
          />
          <Img source={art.hero} box={TOP.hero} resizeMode="cover" />
          <RulesButton onPress={() => setRulesOpen(true)} />

          {tab === 'ranking' ? (
            <EventGifts gifts={event?.event_gifts ?? SAMPLE_GIFTS} />
          ) : (
            <RewardCards tiers={event?.tiers ?? []} />
          )}
          <Countdown seconds={secondsLeft} />
          <Tabs tab={tab} onChange={setTab} />
          {tab === 'ranking' ? <ActivityRanking board={event?.board ?? []} /> : null}
        </View>
      </ScrollView>

      {rulesOpen ? <RulesPopup text={rulesText(event?.rules)} onClose={() => setRulesOpen(false)} /> : null}
    </View>
  );
}

// ---- building blocks ---------------------------------------------------------

function Avatar({ uri, box, dx = 0, dy = 0 }: { uri: string | null | undefined; box: Box; dx?: number; dy?: number }) {
  const { px } = useDesignScale();
  const abs = useBox();
  return (
    <Image
      source={uri ? { uri } : art.avatar}
      resizeMode="cover"
      style={[abs(box, dx, dy), { borderRadius: px(Math.max(box.w, box.h) / 2) }]}
    />
  );
}

// ---- top half -----------------------------------------------------------------

function RulesButton({ onPress }: { onPress: () => void }) {
  const { box, crop, labelCenterX, labelY } = RULES_BUTTON;
  const abs = useBox();
  return (
    <Pressable onPress={onPress} style={abs(box)}>
      <Cropped source={art.rulesButton} box={{ ...box, x: 0, y: 0 }} crop={crop} />
      <Label cx={labelCenterX} y={labelY} size={14} lineHeight={21} weight="medium" width={box.w}>
        Rules
      </Label>
    </Pressable>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const { countdownBg, countdownRow } = TOP;
  return (
    <>
      <Img source={art.countdownBg} box={countdownBg} resizeMode="cover" />
      <CountdownCells x={countdownRow.x} y={countdownRow.y} seconds={seconds} />
    </>
  );
}

function Tabs({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const { tabs } = TOP;
  const items: { key: TabKey; text: string; x: number; idle: ImageSourcePropType }[] = [
    { key: 'ranking', text: 'Ranking', x: tabs.x, idle: art.tabIdleRanking },
    { key: 'reward', text: 'Reward', x: tabs.x + tabs.w - TAB.w, idle: art.tabIdleReward },
  ];
  const abs = useBox();

  return (
    <>
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={abs({ x: it.x, y: tabs.y, w: TAB.w, h: TAB.h })}>
            <Img source={active ? art.tabActive : it.idle} box={{ x: 0, y: 0, w: TAB.w, h: TAB.h }} />
            <Label
              cx={TAB.w / 2}
              y={TAB_LABEL.y}
              size={16}
              lineHeight={24}
              color={active ? TAB_LABEL.active : TAB_LABEL.idle[it.key]}
              width={TAB.w}
            >
              {it.text}
            </Label>
          </Pressable>
        );
      })}
    </>
  );
}

// ---- ornate cards -------------------------------------------------------------

function CardFrame({ spec, title, children }: { spec: CardSpec; title: string; children: ReactNode }) {
  const bottom = <Cropped source={art.cardFrame} box={spec.bottom} crop={BOTTOM_CROP} />;
  return (
    <>
      {spec.bgCrop ? (
        <Cropped source={art.cardBg} box={spec.bg} crop={spec.bgCrop} radius={22} />
      ) : (
        <Img source={art.cardBg} box={spec.bg} resizeMode="cover" radius={22} />
      )}
      <Cropped source={art.cardFrame} box={spec.left} crop={SIDE_CROP} transform="flip" />
      <Cropped source={art.cardFrame} box={spec.right} crop={SIDE_CROP} />
      {spec.bottomOnTop ? null : bottom}
      <Img source={art.ribbon} box={spec.ribbon} resizeMode="cover" />
      <Label
        cx={spec.ribbon.x + spec.ribbon.w / 2}
        y={spec.ribbon.y + RIBBON.labelDy}
        size={RIBBON.labelSize}
        lineHeight={RIBBON.labelHeight}
        width={spec.ribbon.w}
      >
        {title}
      </Label>
      {children}
      {spec.bottomOnTop ? bottom : null}
    </>
  );
}

/** One 69px tile column: the maroon tile, its icon, the caption under it. */
function ItemTile({
  x,
  y,
  icon,
  label,
}: {
  x: number;
  y: number;
  icon?: { source: ImageSourcePropType; box: Box; crop?: Crop };
  label: string;
}) {
  return (
    <>
      <Img source={art.itemTile} box={{ x, y, w: ITEM.w, h: ITEM.tile }} />
      {icon ? (
        icon.crop ? (
          <Cropped source={icon.source} box={{ ...icon.box, x: x + icon.box.x, y: y + icon.box.y }} crop={icon.crop} />
        ) : (
          <Img source={icon.source} box={{ ...icon.box, x: x + icon.box.x, y: y + icon.box.y }} resizeMode="cover" />
        )
      ) : null}
      <Label
        cx={x + ITEM.w / 2}
        y={y + ITEM.tile + ITEM.labelGap}
        size={ITEM.labelSize}
        lineHeight={ITEM.labelHeight}
        width={ITEM.w + 8}
      >
        {label}
      </Label>
    </>
  );
}

/** Lays items out in centred rows of three, as both Figma cards do. */
function rowPositions(count: number, spec: CardSpec) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 3) {
    const n = Math.min(3, count - i);
    const first = i === 0;
    const row = first ? spec.row : (spec.row2 ?? spec.row);
    const gap = first ? ITEM.gap : ITEM.gap2;
    const y = row.y + (first ? 0 : (i / 3 - 1) * 120);
    const width = n * ITEM.w + (n - 1) * gap;
    for (let k = 0; k < n; k++) out.push({ x: row.cx - width / 2 + k * (ITEM.w + gap), y });
  }
  return out;
}

function EventGifts({ gifts }: { gifts: EventGift[] }) {
  const shown = gifts.slice(0, 3);
  const at = rowPositions(shown.length, EVENT_GIFTS);
  return (
    <CardFrame spec={EVENT_GIFTS} title="Event Gifts">
      {shown.map((g, i) => (
        <ItemTile
          key={g.id}
          x={at[i].x}
          y={at[i].y}
          label={String(g.price)}
          icon={g.thumbnail_url ? { source: { uri: g.thumbnail_url }, box: CUSTOM_ICON } : undefined}
        />
      ))}
    </CardFrame>
  );
}

function rewardIcon(r: TierReward) {
  // The real item (the admin's icon, else the frame / medal / VIP badge itself) beats Figma's generic art.
  const uri = r.catalog.image_url ?? r.catalog.icon_url;
  if (uri) return { source: { uri }, box: CUSTOM_ICON };
  const slot = REWARD_ICON[r.catalog.handler_key];
  const source = REWARD_ART[r.catalog.handler_key];
  // VIP has no icon in Figma — its tile is left plain.
  return slot && source ? { source, box: slot, crop: slot.crop } : undefined;
}

function RewardCards({ tiers }: { tiers: Tier[] }) {
  const bands = [...tiers]
    .filter((t) => t.tier_type === 'rank_range')
    .sort((a, b) => (a.rank_from ?? 0) - (b.rank_from ?? 0));
  const count = Math.max(bands.length, REWARD_CARDS.length);

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const spec = cardSpec(i);
        const tier = bands[i];
        const rewards = tier?.rewards ?? [];
        const at = rowPositions(rewards.length, spec);
        return (
          <CardFrame key={tier?.id ?? `card-${i}`} spec={spec} title={tier?.label ?? `Top ${i + 1}`}>
            {rewards.map((r, k) => (
              <ItemTile key={r.id} x={at[k].x} y={at[k].y} label={rewardLabel(r)} icon={rewardIcon(r)} />
            ))}
          </CardFrame>
        );
      })}
    </>
  );
}

function cardSpec(i: number): CardSpec {
  if (i < REWARD_CARDS.length) return REWARD_CARDS[i];
  const base = REWARD_CARDS[REWARD_CARDS.length - 1];
  return shiftCard(base, 0, (i - REWARD_CARDS.length + 1) * REWARD_CARD_STEP);
}

// ---- Activity Ranking -----------------------------------------------------------

function ScorePill({ x, y, score }: { x: number; y: number; score: number | undefined }) {
  const { pill } = RANKING;
  return (
    <>
      <Img source={art.scorePill} box={{ x, y, w: pill.w, h: pill.h }} resizeMode="cover" />
      <Label cx={x + pill.w / 2} y={y + pill.labelY} size={pill.labelSize} lineHeight={pill.labelHeight} width={pill.w}>
        {score == null ? '' : compact(score)}
      </Label>
    </>
  );
}

function ActivityRanking({ board }: { board: BoardRow[] }) {
  const R = RANKING;
  const [first, second, third] = [board[0], board[1], board[2]];
  const name = (row: BoardRow | undefined) => row?.display_name ?? '';
  const t = { x: R.third.at.x + R.third.inner.x, y: R.third.at.y + R.third.inner.y };

  return (
    <>
      <Cropped source={art.rankingFrame} box={R.railLeft} crop={R.railCrop} />
      <Cropped source={art.rankingFrame} box={R.railRight} crop={R.railCrop} transform="mirror" />
      <Img source={art.ribbon} box={R.ribbon} resizeMode="cover" />
      <Label
        cx={R.ribbon.x + R.ribbon.w / 2}
        y={R.ribbon.y + RIBBON.labelDy}
        size={RIBBON.labelSize}
        lineHeight={RIBBON.labelHeight}
        width={R.ribbon.w}
      >
        Activity Ranking
      </Label>

      {/* Top 1 — photo under its crown */}
      <Avatar uri={first?.avatar_url} box={R.first.avatar} />
      <Cropped source={art.podium[0]} box={R.first.frame} crop={R.first.frameCrop} />
      <Label cx={R.first.nameCenterX} y={R.first.nameY} size={R.first.nameSize} lineHeight={R.first.nameHeight}>
        {name(first)}
      </Label>
      <ScorePill x={R.first.pill.x} y={R.first.pill.y} score={first?.score} />

      {/* Top 2 — Figma draws this photo over its frame */}
      <Cropped
        source={art.podium[1]}
        box={{ ...R.second.frame, x: R.second.at.x + R.second.frame.x, y: R.second.at.y + R.second.frame.y }}
        crop={R.second.frameCrop}
      />
      <Avatar uri={second?.avatar_url} box={R.second.avatar} dx={R.second.at.x} dy={R.second.at.y} />
      <Label
        cx={R.second.at.x + R.second.nameCenterX}
        y={R.second.at.y + R.second.nameY}
        size={R.podiumNameSize}
        lineHeight={R.podiumNameHeight}
        width={150}
      >
        {name(second)}
      </Label>

      {board.slice(3, 10).map((row, i) => (
        <RankRow key={row.entity_id} row={row} y={R.rows.y + i * R.rows.step} />
      ))}

      <Cropped source={art.rankingFooter} box={R.footer} crop={R.footerCrop} />

      {/* Top 3 — photo under its frame */}
      <Avatar uri={third?.avatar_url} box={R.third.avatar} dx={t.x} dy={t.y} />
      <Cropped
        source={art.podium[2]}
        box={{ ...R.third.frame, x: t.x + R.third.frame.x, y: t.y + R.third.frame.y }}
        crop={R.third.frameCrop}
      />
      <Label
        cx={t.x + R.third.nameCenterX}
        y={t.y + R.third.nameY}
        size={R.podiumNameSize}
        lineHeight={R.podiumNameHeight}
        width={150}
      >
        {name(third)}
      </Label>
      <ScorePill x={R.third.at.x + R.third.pill.x} y={R.third.at.y + R.third.pill.y} score={third?.score} />

      <ScorePill x={R.second.pill.x} y={R.second.pill.y} score={second?.score} />
    </>
  );
}

function RankRow({ row, y }: { row: BoardRow; y: number }) {
  const { px } = useDesignScale();
  const r = RANKING.rows;
  return (
    <View
      style={{
        position: 'absolute',
        left: px(r.x),
        top: px(y),
        width: px(r.w),
        height: px(r.h),
        backgroundColor: r.fill,
        borderColor: r.stroke,
        borderWidth: px(r.border),
        borderRadius: px(r.radius),
        overflow: 'hidden',
      }}
    >
      <Label cx={r.rankCenterX} y={r.rankY} size={16} lineHeight={24} width={36}>
        {row.rank}
      </Label>
      <Avatar uri={row.avatar_url} box={r.avatar} />
      <Label x={r.nameX} y={r.nameY} size={14} lineHeight={21} weight="medium" width={r.nameW}>
        {row.display_name ?? ''}
      </Label>
      <Label x={r.scoreX} y={r.scoreY} size={14} lineHeight={21} weight="medium" width={r.coin.x - r.scoreX}>
        {compact(row.score)}
      </Label>
      <Img source={art.coin} box={r.coin} resizeMode="cover" />
    </View>
  );
}

// ---- Rules popup (587:5686) -----------------------------------------------------

function RulesPopup({ text, onClose }: { text: string; onClose: () => void }) {
  const { px } = useDesignScale();
  const abs = useBox();
  const p = RULES_POPUP;
  return (
    <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: p.scrim }]} onPress={onClose}>
      {/* Swallow taps on the panel itself so only the scrim and the X close it. */}
      <Pressable style={abs(p.art)} onPress={() => {}}>
        <Img source={art.rulesPopup} box={{ ...p.art, x: 0, y: 0 }} />
      </Pressable>
      <Text
        style={{
          position: 'absolute',
          left: px(p.text.x),
          top: px(p.text.y),
          width: px(p.text.w),
          fontFamily: typography.fontFamily.regular,
          fontSize: px(p.text.size),
          lineHeight: px(p.text.lineHeight),
          color: p.text.color,
          textAlign: 'center',
        }}
      >
        {text}
      </Text>
      <Pressable style={abs(p.close)} onPress={onClose} hitSlop={px(8)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
