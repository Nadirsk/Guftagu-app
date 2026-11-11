import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { preloadSvgas } from '../../lib/svga/load';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { avatarOf } from '../chats/parts';
import { cachedStoreItems, rememberStoreItems } from './cache';
import { SHEET, STORE } from './geometry';
import { ConfirmDialog, FramedAvatar, InsufficientCoinsDialog, isInsufficientCoins, PillButton, PriceRow, STORE_EXTRA_TABS, STORE_TABS, type StoreItem, styles as s, TopBar } from './parts';

/**
 * Profile → Store, drawn as Figma's "Mall" (section 4002:8276) on a white page, titled
 * Store and without the frame's backpack and file-search buttons.
 *   4001:7883  the grid, one tab per item type
 *   4001:7953  tapping a card: the page fades and the item stands on a podium, worn by you,
 *              over its name, Send and Purchase
 *   4001:8036  Purchase → "Are you sure to purchase it ?"
 * Send opens `StoreSend` (the Select frames). Every number is a design pixel, scaled by `px`.
 */

const podiumArt = require('../../assets/store/podium.png');

const TABS = STORE_TABS;

type Nav = NativeStackNavigationProp<RootStackParamList>;

function Card({ item, onPress }: { item: StoreItem; onPress: () => void }) {
  const { px } = useDesignScale();
  const c = STORE.card;
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: px(c.width),
        height: px(c.height),
        borderRadius: px(c.radius),
        // Figma's card is white at 38% over a magenta page. The page here is white, so the
        // card gets a deep plum of its own — it reads as a tile, and gold frames pop on it.
        backgroundColor: c.background,
        overflow: 'hidden',
      }}
    >
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          resizeMode="contain"
          style={{ position: 'absolute', top: px(c.image.top), left: px((c.width - c.image.width) / 2), width: px(c.image.width), height: px(c.image.height) }}
        />
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, top: px(c.bar.top), height: px(c.bar.height), backgroundColor: c.bar.background }}>
        <Text numberOfLines={1} style={[s.medium, s.white, s.line, { top: px(c.name.top), fontSize: px(c.name.size), lineHeight: px(c.name.line), paddingHorizontal: px(6) }]}>
          {item.name}
        </Text>
        <View style={[s.line, s.center, { top: px(c.price.top) }]}>
          <PriceRow item={item} u={px} />
        </View>
      </View>
    </Pressable>
  );
}

export default function StoreScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token, user } = useAuth();
  // Last visit's list first, so the grid is there at once; `load` then refreshes it.
  const [items, setItems] = useState<StoreItem[]>(() => cachedStoreItems() ?? []);
  const [loaded, setLoaded] = useState(() => cachedStoreItems() !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState(TABS[0].type);
  const [selected, setSelected] = useState<StoreItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noCoins, setNoCoins] = useState(false);
  const myAvatar = avatarOf(user);

  const load = useCallback(async () => {
    try {
      const res = await api<StoreItem[]>('/store/items', { token });
      setItems(rememberStoreItems(Array.isArray(res) ? res : []));
    } catch {
      // Keep whatever is already on screen.
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = useMemo(() => {
    const extra = STORE_EXTRA_TABS.filter((t) => items.some((i) => i.type === t.type));
    return [...TABS, ...extra];
  }, [items]);

  const shown = items.filter((i) => i.type === tab);

  // Decoding an animation takes a moment, so the tab's are readied while you browse
  // and a tapped card plays straight away instead of showing its still first.
  const animations = shown.map((i) => i.animation_url).filter((url): url is string => !!url).join('\n');
  useEffect(() => (animations ? preloadSvgas(animations.split('\n')) : undefined), [animations]);

  const rows: StoreItem[][] = [];
  for (let n = 0; n < shown.length; n += 2) rows.push(shown.slice(n, n + 2));

  const purchase = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/store/items/${selected.id}/purchase`, { method: 'POST', token });
      setConfirming(false);
      setSelected(null);
      // It lands in the Item Bag under its own category; offer the way there.
      const category = [...STORE_TABS, ...STORE_EXTRA_TABS].find((c) => c.type === selected.type)?.label;
      Alert.alert('Purchased', `${selected.name} is in your Item Bag${category ? ` under ${category}` : ''}.`, [
        { text: 'OK', style: 'cancel' },
        { text: 'Open Item Bag', onPress: () => navigation.navigate('ItemBag') },
      ]);
    } catch (e) {
      if (isInsufficientCoins(e)) {
        setConfirming(false);
        setNoCoins(true);
        return;
      }
      Alert.alert('Purchase', e instanceof ApiError ? e.displayMessage : 'Could not complete the purchase.');
    } finally {
      setBusy(false);
    }
  };

  const T = STORE.tabs;
  const G = STORE.grid;
  const H = SHEET;
  const B = H.buttons;
  // Everything on the sheet is placed from the item's top edge, so the stack can sit on the bottom.
  const at = (y: number) => px(y - H.top);

  return (
    <View style={styles.screen}>
      <TopBar
        back={STORE.back}
        title={{ text: 'Store', ...STORE.title }}
        color={colors.black}
        onBack={() => navigation.goBack()}
        u={px}
      />

      {/* Group 8756 — the type tabs; more than four run off the edge, so they scroll. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', left: 0, right: 0, top: px(T.y), height: px(T.underlineY + 4) }}
        contentContainerStyle={{ paddingHorizontal: px(T.x), gap: px(T.gap) }}
      >
        {tabs.map((t) => {
          const on = t.type === tab;
          return (
            <Pressable key={t.type} onPress={() => setTab(t.type)} hitSlop={px(6)} style={{ alignItems: 'center' }}>
              <Text style={[s.semiBold, { color: colors.black, opacity: on ? 1 : T.inactive, fontSize: px(T.size), lineHeight: px(T.line) }]}>
                {t.label}
              </Text>
              {on ? (
                <View style={{ position: 'absolute', top: px(T.underlineY), width: px(T.underlineWidth), height: Math.max(1, px(T.underline)), backgroundColor: colors.black }} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Positioned by a wrapper: with a refreshControl, react-native-web applies the
          ScrollView's own style twice (to the refresh wrapper and the scroller), doubling `top`. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: px(T.y + T.underlineY + 8), bottom: 0 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: px(G.y - (T.y + T.underlineY + 8)), paddingHorizontal: px(G.x), paddingBottom: px(40), gap: px(G.rowGap) }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          {rows.map((pair) => (
            <View key={pair[0].id} style={[s.row, { gap: px(G.colGap) }]}>
              {pair.map((item) => (
                <Card key={item.id} item={item} onPress={() => setSelected(item)} />
              ))}
            </View>
          ))}
          {!loaded ? (
            <ActivityIndicator style={{ marginTop: px(120) }} color={colors.black} />
          ) : shown.length === 0 ? (
            <Text style={[s.regular, styles.empty, { marginTop: px(120), fontSize: px(16) }]}>Nothing here yet</Text>
          ) : null}
        </ScrollView>
      </View>

      {/* 4001:7953 — tapping anywhere off the buttons closes it. */}
      {selected && !confirming ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', H.fadeColor, H.fadeColor]}
            locations={[0, H.fadeFull, 1]}
            style={{ position: 'absolute', left: 0, right: 0, height: px(H.fadeHeight), bottom: 0 }}
          />
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: px(H.bottom), height: at(B.top + B.height) }}>
            <Image
              source={podiumArt}
              resizeMode="contain"
              style={{ position: 'absolute', top: at(H.podium.top), left: px((402 - H.podium.width) / 2), width: px(H.podium.width), height: px(H.podium.height) }}
            />
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: px((402 - H.item.size) / 2 + H.item.dx) }}>
              <FramedAvatar
                item={selected}
                avatar={myAvatar}
                size={H.item.size}
                avatarSize={H.avatar.size}
                avatarDx={H.avatar.dx - H.item.dx}
                avatarDy={H.avatar.top - H.top}
                u={px}
              />
            </View>
            <Text numberOfLines={1} style={[s.medium, s.white, s.line, { top: at(H.name.top), fontSize: px(H.name.size), lineHeight: px(H.name.line) }]}>
              {selected.name}
            </Text>
            <View style={[s.line, s.center, { top: at(H.name.top + H.name.line + H.priceGap) }]}>
              <PriceRow item={selected} u={px} />
            </View>
            <View style={[s.row, s.line, { justifyContent: 'center', top: at(B.top), gap: px(B.gap) }]}>
              <PillButton
                label="Send"
                width={px(B.width)}
                height={px(B.height)}
                radius={px(B.radius)}
                size={px(B.size)}
                onPress={() => {
                  const item = selected;
                  setSelected(null);
                  navigation.navigate('StoreSend', { item });
                }}
              />
              <PillButton
                label="Purchase"
                primary
                width={px(B.width)}
                height={px(B.height)}
                radius={px(B.radius)}
                size={px(B.size)}
                onPress={() => setConfirming(true)}
              />
            </View>
          </View>
        </View>
      ) : null}

      {selected && confirming ? (
        <ConfirmDialog
          variant="purchase"
          item={selected}
          avatar={myAvatar}
          question="Are you sure to purchase it ?"
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={purchase}
          u={px}
        />
      ) : null}

      {noCoins ? (
        <InsufficientCoinsDialog
          u={px}
          onClose={() => setNoCoins(false)}
          onRecharge={() => {
            setNoCoins(false);
            setSelected(null);
            navigation.navigate('Wallet', { tab: 'coin' });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  empty: { color: 'rgba(0,0,0,0.4)', textAlign: 'center' },
});
