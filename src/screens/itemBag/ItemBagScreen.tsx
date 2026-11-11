import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { type ReactNode, useCallback, useEffect, useId, useState } from 'react';
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import Svg, { Defs, LinearGradient, Rect, Stop, SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/item-bag/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { STORE_EXTRA_TABS, STORE_TABS, styles as s, TopBar } from '../store/parts';
import { HIGHLIGHT, ITEMS, PAGE, SHEET, SLOTS } from './geometry';
import { cachedOwned, fetchOwned, type OwnedItem, rememberOwned } from './owned';

/**
 * Profile → Item Bag (Figma 2015:9442), showing only category cards, one per type — each
 * shows the first item of its list (the worn one, else the first you own), or the
 * empty inbox when you own none of that type. Figma's "All Items" list is left out on
 * purpose: everything you own is reached through its category.
 *
 * Tapping a category opens its sheet (2015:9551 / 2015:9611) with every item of that
 * type. The one you wear comes first, outlined in cyan with the check, and is picked
 * when the sheet opens, so the button reads Unequip; unequipping takes it off
 * everywhere. Tapping any other item outlines it in white and the button reads Equip.
 */

const art = require('../../assets/item-bag/background.png');

/** Every type the Store sells: Figma's four, then the rest. */
const CATEGORIES = [...STORE_TABS, ...STORE_EXTRA_TABS];
const sheetArt = require('../../assets/item-bag/sheet.png');


const DAY = 24 * 60 * 60 * 1000;

/** A category's list as the sheet shows it: the worn item first, the rest in the API's order. */
const wornFirst = (list: OwnedItem[]) => [...list.filter((i) => i.equipped), ...list.filter((i) => !i.equipped)];

const remaining = (item: OwnedItem) => {
  if (!item.expires_at) return 'Permanent';
  const days = Math.max(1, Math.ceil((Date.parse(item.expires_at) - Date.now()) / DAY));
  return `${days} ${days === 1 ? 'day' : 'days'} remaining`;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** The white and cyan blurs in a card's top-left corner. */
function Glow() {
  const { px } = useDesignScale();
  const g = SLOTS.glows;
  const pad = (g.box - g.size) / 2;
  return (
    <>
      {([
        [icons.glowWhite, g.white],
        [icons.glowCyan, g.cyan],
      ] as const).map(([xml, at]) => (
        <View key={at.x} pointerEvents="none" style={{ position: 'absolute', left: px(at.x - pad), top: px(at.y - pad) }}>
          <SvgXml xml={xml} width={px(g.box)} height={px(g.box)} />
        </View>
      ))}
    </>
  );
}

/**
 * A card: its fill and glow clipped to the 9px corner, and over them the stroke that
 * fades from the top-left corner (an SVG rect, since a View border is one colour).
 * The inner view keeps a transparent 1px border so content sits where Figma puts it.
 */
function CardShell({
  x,
  y,
  width,
  background,
  ring,
  onPress,
  children,
}: {
  x: number;
  y: number;
  width: number;
  background: string;
  /** A solid outline instead of Figma's fading stroke — the worn or picked item. */
  ring?: string;
  onPress?: () => void;
  children: ReactNode;
}) {
  const { px } = useDesignScale();
  const id = `itemBagStroke${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { height, radius, border } = SLOTS;
  const w = px(width);
  const h = px(height);
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={{ position: 'absolute', left: px(x), top: px(y), width: w, height: h }}>
      <View style={[StyleSheet.absoluteFill, styles.card, { borderRadius: px(radius), backgroundColor: background }]}>
        <Glow />
        {children}
      </View>
      <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {border.stops.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor={border.color} stopOpacity={opacity} />
            ))}
          </LinearGradient>
        </Defs>
        {ring ? (
          <Rect x={HIGHLIGHT.width / 2} y={HIGHLIGHT.width / 2} width={w - HIGHLIGHT.width} height={h - HIGHLIGHT.width} rx={px(radius) - HIGHLIGHT.width / 2} fill="none" stroke={ring} strokeWidth={HIGHLIGHT.width} />
        ) : (
          <Rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={px(radius) - 0.5} fill="none" stroke={`url(#${id})`} strokeWidth={1} />
        )}
      </Svg>
    </Pressable>
  );
}

function Slot({ label, preview, x, y, onPress }: { label: string; preview?: OwnedItem; x: number; y: number; onPress: () => void }) {
  const { px } = useDesignScale();
  const c = SLOTS;
  const inner = { w: c.width - 2, h: c.height - 2 };
  const img = c.worn.image;
  const size = label.length >= c.label.longFrom ? c.label.longSize : c.label.size;
  const labelStyle = [s.medium, s.white, { fontSize: px(size), lineHeight: px(c.label.line), textAlign: 'center' as const }];
  return (
    <CardShell x={x} y={y} width={c.width} background={c.background} onPress={onPress}>
      {preview ? (
        <>
          <Text numberOfLines={1} style={[labelStyle, styles.line, { top: px(c.worn.labelTop) }]}>
            {label}
          </Text>
          {preview.image_url ? (
            <Image
              source={{ uri: preview.image_url }}
              resizeMode="contain"
              style={{
                position: 'absolute',
                left: px(inner.w / 2 + img.dx - img.width / 2),
                top: px(inner.h / 2 + img.dy - img.height / 2),
                width: px(img.width),
                height: px(img.height),
              }}
            />
          ) : null}
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, s.center, { gap: px(c.empty.gap), transform: [{ translateY: px(c.empty.dy) }] }]}>
          <Text numberOfLines={1} style={labelStyle}>
            {label}
          </Text>
          <SvgXml xml={icons.inbox} width={px(c.empty.icon)} height={px(c.empty.icon)} />
        </View>
      )}
    </CardShell>
  );
}

function OwnedCard({ item, picked, x, y, onPress }: { item: OwnedItem; picked: boolean; x: number; y: number; onPress: () => void }) {
  const { px } = useDesignScale();
  const c = ITEMS;
  const st = c.stack;
  const ring = item.equipped ? HIGHLIGHT.worn : picked ? HIGHLIGHT.picked : undefined;
  return (
    <CardShell x={x} y={y} width={c.width} background={c.background} ring={ring} onPress={onPress}>
      <View style={[StyleSheet.absoluteFill, s.center, { transform: [{ translateY: px(st.dy) }] }]}>
        <View style={{ width: px(st.width), alignItems: 'center', gap: px(st.gap) }}>
          <Text numberOfLines={2} style={[s.medium, s.white, { width: '100%', textAlign: 'center', opacity: st.opacity, fontSize: px(st.size), lineHeight: px(st.line) }]}>
            {remaining(item)}
          </Text>
          <View style={{ width: px(c.image.width), height: px(c.image.height) }}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
            ) : null}
          </View>
        </View>
      </View>
      {item.equipped ? (
        <View style={{ position: 'absolute', left: px(c.check.x), top: px(c.check.y) }}>
          <SvgXml xml={icons.circleCheck} width={px(c.check.size)} height={px(c.check.size)} />
        </View>
      ) : null}
    </CardShell>
  );
}

/** 2015:9551 / 2015:9611 — one slot's items over a dimmed page; tapping the dim closes it. */
function SlotSheet({
  label,
  items,
  picked,
  busy,
  onPick,
  onToggle,
  onClose,
}: {
  label: string;
  items: OwnedItem[];
  picked: OwnedItem | undefined;
  busy: boolean;
  onPick: (item: OwnedItem) => void;
  onToggle: (item: OwnedItem) => void;
  onClose: () => void;
}) {
  const { px } = useDesignScale();
  const S = SHEET;
  const C = S.cards;
  const B = S.button;
  const half = S.width / 2;
  const rows = Math.ceil(items.length / 3);
  const sorted = wornFirst(items);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: S.scrim }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ position: 'absolute', bottom: 0, left: px(S.left), width: px(S.width), height: px(S.height), backgroundColor: S.background, overflow: 'hidden' }}>
        <Image source={sheetArt} resizeMode="cover" style={{ position: 'absolute', left: px(S.art.left), top: px(S.art.top), width: px(S.art.width), height: px(S.art.height) }} />
        <Text numberOfLines={1} style={[s.medium, s.white, styles.line, { textAlign: 'center', top: px(S.title.top), marginLeft: px(S.title.dx * 2), fontSize: px(S.title.size), lineHeight: px(S.title.line) }]}>
          {label}
        </Text>

        {/* The cards, scrolling if there are more than two rows above the button. */}
        <ScrollView
          style={{ position: 'absolute', left: 0, right: 0, top: px(C.top), height: px(B.top - C.top - 8) }}
          contentContainerStyle={{ height: px(Math.max(1, rows) * C.rowStep) }}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <Text style={[s.regular, styles.empty, { top: px(40), fontSize: px(14) }]}>Nothing here yet</Text>
          ) : (
            sorted.map((item, n) => (
              <OwnedCard
                key={`${item.id}-${n}`}
                item={item}
                picked={item.id === picked?.id}
                x={half + ((n % 3) - 1) * C.colStep - ITEMS.width / 2}
                y={Math.floor(n / 3) * C.rowStep}
                onPress={() => onPick(item)}
              />
            ))
          )}
        </ScrollView>

        {picked ? (
          <Pressable
            disabled={busy}
            onPress={() => onToggle(picked)}
            style={[s.center, { position: 'absolute', top: px(B.top), left: px(half - B.width / 2), width: px(B.width), height: px(B.height), borderRadius: px(B.radius), backgroundColor: B.background }]}
          >
            <Text style={[s.medium, { color: B.color, fontSize: px(B.size), lineHeight: px(B.line) }]}>{picked.equipped ? 'Unequip' : 'Equip'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function ItemBagScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [items, setItems] = useState<OwnedItem[] | null>(cachedOwned);
  const [busy, setBusy] = useState(false);
  /** The open sheet's slot, and the item picked in it (by default the one on). */
  const [sheet, setSheet] = useState<{ type: string; label: string; pickedId: number | null } | null>(null);

  const ofType = (type: string) => (items ?? []).filter((i) => i.type === type);
  /** Picks the worn item, so its Unequip is one tap away; with none on, nothing is picked yet. */
  const openSheet = (type: string) => {
    const label = CATEGORIES.find((t) => t.type === type)?.label ?? type;
    setSheet({ type, label, pickedId: ofType(type).find((i) => i.equipped)?.id ?? null });
  };

  // Android's back closes the sheet before it leaves the page.
  useEffect(() => {
    if (!sheet) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSheet(null);
      return true;
    });
    return () => sub.remove();
  }, [sheet]);

  // Reloaded on every visit: a purchase in the Store lands here.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      let live = true;
      fetchOwned(token)
        .then((res) => {
          if (live) setItems(res);
        })
        .catch(() => {
          if (live) setItems((prev) => prev ?? []);
        });
      return () => {
        live = false;
        setStatusBarStyle('dark');
      };
    }, [token]),
  );

  /** Put it on (the slot's other item comes off) or take it off — shown at once, undone on failure. */
  const toggle = async (item: OwnedItem) => {
    if (busy || !items) return;
    const before = items;
    const wear = !item.equipped;
    const next = items.map((i) =>
      i.id === item.id ? { ...i, equipped: wear } : wear && i.type === item.type ? { ...i, equipped: false } : i,
    );
    setItems(next);
    setBusy(true);
    try {
      await api(`/store/items/${item.id}/equip`, { method: wear ? 'POST' : 'DELETE', token });
      rememberOwned(next);
    } catch (e) {
      setItems(before);
      Alert.alert('Item Bag', e instanceof ApiError ? e.displayMessage : 'Could not change that item.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: PAGE.background }]}>
      <Image source={art} resizeMode="cover" style={{ position: 'absolute', top: 0, left: px(PAGE.art.left), width: px(PAGE.art.width), height: px(PAGE.art.height) }} />

      <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ height: px(PAGE.art.height) }} showsVerticalScrollIndicator={false}>
        {CATEGORIES.map((t, n) => (
          <Slot
            key={t.type}
            label={t.label}
            preview={wornFirst(ofType(t.type))[0]}
            x={SLOTS.grid.xs[n % 3]}
            y={SLOTS.grid.y + Math.floor(n / 3) * SLOTS.grid.rowStep}
            onPress={() => openSheet(t.type)}
          />
        ))}
      </ScrollView>

      <TopBar back={PAGE.back} title={{ text: 'Item Bag', ...PAGE.title }} color={colors.white} onBack={() => navigation.goBack()} u={px} />

      {sheet ? (
        <SlotSheet
          label={sheet.label}
          items={ofType(sheet.type)}
          picked={ofType(sheet.type).find((i) => i.id === sheet.pickedId)}
          busy={busy}
          onPick={(item) => setSheet({ ...sheet, pickedId: item.id })}
          onToggle={toggle}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  line: { position: 'absolute', left: 0, right: 0 },
  empty: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)' },
});
