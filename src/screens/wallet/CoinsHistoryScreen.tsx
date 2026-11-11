import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { apiWithMeta } from '../../api/client';
import * as settingsIcons from '../../assets/settings/icons';
import * as icons from '../../assets/wallet/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Coins / Diamonds history (Figma 211:7265, 402 x 874): the "Details" page behind the
 * Wallet's clock icon. Consume / Income switch the list, the date and "All" filter sit
 * under them. Figma draws only the empty state; the list is
 * `GET /wallet/{coins|diamonds}/transactions` — Consume is the debits, Income the credits —
 * narrowed by the "All" category chips and the date pill. It opens from the Wallet's active
 * tab, so the Diamonds tab shows diamond history.
 */

type Tx = {
  uuid: string;
  direction: 'credit' | 'debit';
  amount: number;
  signed_amount: number;
  balance_after: number;
  type: string;
  note: string | null;
  created_at: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  gift_send: 'Gift sent',
  gift_sent: 'Gift sent',
  gift_receive: 'Gift received',
  gift_received: 'Gift received',
  recharge: 'Recharge',
  exchange_from_diamond: 'Exchanged from diamonds',
  exchange_to_coin: 'Exchanged to coins',
  store_purchase: 'Mall purchase',
  daily_checkin: 'Daily check-in',
  ranking_reward: 'Ranking reward',
  event_tier_reward: 'Event reward',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin debit',
  withdrawal_settled: 'Withdrawal',
  test_topup: 'Top-up',
};

const humanize = (type: string) => TYPE_LABEL[type] ?? type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Every chip is a group of real ledger types. Figma's Lucky Gift / Game / Red Packet have no
// ledger type behind them (those features do not exist), so the panel offers the groups the
// ledger does carry, in the same five slots.
const CHIP_TYPES: Record<string, string> = {
  Gift: 'gift_send,gift_sent,gift_receive,gift_received',
  Mall: 'store_purchase',
  Recharge: 'recharge,test_topup',
  Rewards: 'daily_checkin,ranking_reward,event_tier_reward',
  Other: 'admin_credit,admin_debit,withdrawal_settled',
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function when(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const EMPTY = require('../../assets/wallet/history-empty.png');
const FILTER_BLUE = '#00B2FF'; // the "All" pill (211:7279)
const TABS = ['Consume Details', 'Income Details'] as const;
// The opened "All" panel (214:1223): chip rows of 119 / 91 / 91 and 119 / 91, 10 apart.
const FILTER_ROWS = [
  [['All', 119], ['Gift', 91], ['Mall', 91]],
  [['Recharge', 119], ['Rewards', 91], ['Other', 91]],
] as const;

export default function CoinsHistoryScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const { token } = useAuth();
  const currency = useRoute<RouteProp<RootStackParamList, 'CoinsHistory'>>().params?.currency ?? 'coin';
  const [tab, setTab] = useState<(typeof TABS)[number]>('Consume Details');
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string | null>(null); // a picked day, YYYY-MM-DD; null = all dates
  const [calOpen, setCalOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const [items, setItems] = useState<Tx[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0); // drops a response that a newer filter has outdated

  const query = useCallback(
    (after: string | null) => {
      const p = new URLSearchParams({ limit: '30', direction: tab === 'Consume Details' ? 'debit' : 'credit' });
      if (filter !== 'All') p.set('types', CHIP_TYPES[filter] ?? 'none');
      if (date) {
        p.set('from', date);
        p.set('to', date);
      }
      if (after) p.set('cursor', after);
      return `/wallet/${currency === 'coin' ? 'coins' : 'diamonds'}/transactions?${p.toString()}`;
    },
    [currency, tab, filter, date],
  );

  const load = useCallback(
    async (after: string | null) => {
      const mine = ++generation.current;
      setLoading(true);
      try {
        const res = await apiWithMeta<Tx[]>(query(after), { token });
        if (mine !== generation.current) return;
        setItems((prev) => (after ? [...prev, ...res.data] : res.data));
        setCursor(res.meta?.next_cursor ?? null);
      } catch {
        if (mine === generation.current && !after) setItems([]);
      } finally {
        if (mine === generation.current) setLoading(false);
      }
    },
    [query, token],
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    load(null);
  }, [load]);

  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });

  return (
    <View style={styles.screen}>
      {/* Details + arrow-left-normal */}
      <Text style={[at(170, 62), { fontFamily: typography.fontFamily.medium, fontSize: px(20), lineHeight: px(26), color: colors.black }]}>Details</Text>
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} accessibilityLabel="Back" style={[at(15, 58), { width: px(34), height: px(34) }]}>
        <SvgXml xml={settingsIcons.arrowLeft} width={px(34)} height={px(34)} />
      </Pressable>

      {/* Frame 1597881322 — Consume Details / Income Details. */}
      <View style={[at(15, 144), { flexDirection: 'row', alignItems: 'center', gap: px(15) }]}>
        {TABS.map((name) => (
          <Pressable key={name} onPress={() => setTab(name)}>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(16), lineHeight: px(19), color: colors.black, opacity: tab === name ? 1 : 0.45 }}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* The transactions. */}
      {items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(t) => t.uuid}
          style={[at(0, 252), { right: 0, bottom: 0 }]}
          contentContainerStyle={{ paddingHorizontal: px(15), paddingBottom: px(40) }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (cursor && !loading) load(cursor);
          }}
          ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: px(16) }} /> : undefined}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: px(14), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.15)' }}>
              <View style={{ flex: 1, paddingRight: px(12) }}>
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(16), lineHeight: px(21), color: colors.black }}>{item.note?.trim() || humanize(item.type)}</Text>
                <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(13), lineHeight: px(18), color: colors.black, opacity: 0.5 }}>{item.note?.trim() ? `${humanize(item.type)} · ` : ''}{when(item.created_at)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(17), lineHeight: px(22), color: item.direction === 'credit' ? '#1FA45B' : '#E5484D' }}>
                  {item.direction === 'credit' ? '+' : '-'}{item.amount.toLocaleString('en-US')}
                </Text>
                <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(12), lineHeight: px(16), color: colors.black, opacity: 0.4 }}>Balance {item.balance_after.toLocaleString('en-US')}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Frame 8978 — "No data temporarily...". */}
      {items.length === 0 && !loading && (
        <>
          <Image source={EMPTY} resizeMode="cover" style={[at(58, 364), { width: px(287), height: px(287) }]} />
          <Text style={[at(58, 626), { width: px(287), textAlign: 'center', fontFamily: typography.fontFamily.regular, fontSize: px(20), lineHeight: px(25), color: colors.black, opacity: 0.4 }]}>
            No data temporarily...
          </Text>
        </>
      )}
      {items.length === 0 && loading && <ActivityIndicator style={at(186, 420)} />}

      {/* Frame 1597881323 — the date and the "All" filter. Drawn after the list so the open panel sits over it. */}
      <View style={[at(15, 197), { width: px(372), height: px(43) }]}>
        <Pressable
          onPress={() => {
            setCalOpen((o) => !o);
            setOpen(false);
          }}
          accessibilityLabel="Pick a date"
          style={{ position: 'absolute', left: 0, top: px(9.5), flexDirection: 'row', alignItems: 'center', gap: px(4) }}
        >
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(15), lineHeight: px(23), color: colors.black, marginRight: px(13 - 4) }}>{date ?? 'All dates'}</Text>
          <SvgXml xml={icons.calendarDays} width={px(24)} height={px(24)} />
          <SvgXml xml={settingsIcons.chevronForward} width={px(24)} height={px(24)} style={{ transform: [{ rotate: calOpen ? '-90deg' : '90deg' }] }} />
        </Pressable>
        {/* The pill grows with its label (Figma's is 83 wide for "All"), so "Recharge" never meets the chevron. */}
        <Pressable
          onPress={() => {
            setOpen((o) => !o);
            setCalOpen(false);
          }}
          style={{ position: 'absolute', right: 0, top: 0, minWidth: px(83), height: px(43), borderRadius: px(55), backgroundColor: FILTER_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingLeft: px(18), paddingRight: px(12), gap: px(4) }}
        >
          <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.medium, fontSize: px(15), lineHeight: px(19), color: colors.white }}>{filter}</Text>
          <SvgXml xml={icons.chevronDownWhite} width={px(24)} height={px(24)} style={{ transform: open ? [{ rotate: '180deg' }] : [] }} />
        </Pressable>
      </View>

      {/* The date picker — a month grid; a day filters to that day, "All dates" clears it. */}
      {calOpen && (
        <View style={[at(15, 257), styles.panel, { width: px(372), borderRadius: px(13), paddingBottom: px(12), shadowOffset: { width: 0, height: px(8) }, shadowRadius: px(5.9) }]}>
          {(() => {
            const today = new Date();
            const first = new Date(month.y, month.m, 1).getDay();
            const days = new Date(month.y, month.m + 1, 0).getDate();
            const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
            const step = (d: number) => setMonth(({ y, m }) => {
              const n = new Date(y, m + d, 1);
              return { y: n.getFullYear(), m: n.getMonth() };
            });
            const atCurrent = month.y === today.getFullYear() && month.m === today.getMonth();
            const cell = px(52);
            return (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: px(16), paddingTop: px(14), paddingBottom: px(8) }}>
                  <Pressable onPress={() => step(-1)} hitSlop={px(10)} accessibilityLabel="Previous month"><Text style={{ fontSize: px(22), color: colors.black }}>‹</Text></Pressable>
                  <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(16), color: colors.black }}>{MONTH_NAMES[month.m]} {month.y}</Text>
                  <Pressable onPress={() => !atCurrent && step(1)} hitSlop={px(10)} accessibilityLabel="Next month"><Text style={{ fontSize: px(22), color: colors.black, opacity: atCurrent ? 0.2 : 1 }}>›</Text></Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                  {WEEKDAYS.map((w) => (
                    <Text key={w} style={{ width: cell, textAlign: 'center', fontFamily: typography.fontFamily.regular, fontSize: px(12), color: colors.black, opacity: 0.45 }}>{w}</Text>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: cell * 7, alignSelf: 'center' }}>
                  {cells.map((d, i) => {
                    if (d === null) return <View key={`b${i}`} style={{ width: cell, height: px(40) }} />;
                    const key = ymd(new Date(month.y, month.m, d));
                    const future = new Date(month.y, month.m, d) > today;
                    const picked = key === date;
                    return (
                      <Pressable
                        key={key}
                        disabled={future}
                        onPress={() => {
                          setDate(key);
                          setCalOpen(false);
                        }}
                        style={{ width: cell, height: px(40), alignItems: 'center', justifyContent: 'center' }}
                      >
                        <View style={{ width: px(34), height: px(34), borderRadius: px(17), alignItems: 'center', justifyContent: 'center', backgroundColor: picked ? FILTER_BLUE : undefined }}>
                          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(14), color: picked ? colors.white : colors.black, opacity: future ? 0.25 : 1 }}>{d}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={() => {
                    setDate(null);
                    setCalOpen(false);
                  }}
                  style={{ alignSelf: 'center', marginTop: px(8), paddingHorizontal: px(22), height: px(36), borderRadius: px(18), borderWidth: 1, borderColor: 'rgba(0,0,0,0.29)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(14), color: colors.black }}>All dates</Text>
                </Pressable>
              </>
            );
          })()}
        </View>
      )}

      {/* Frame 1597881324 — the filter panel. */}
      {open && (
        <View style={[at(15, 257), styles.panel, { width: px(372), height: px(174), borderRadius: px(13), shadowOffset: { width: 0, height: px(8) }, shadowRadius: px(5.9) }]}>
          {FILTER_ROWS.map((row, r) => (
            <View key={r} style={[at(16, r === 0 ? 29 : 86), { flexDirection: 'row', gap: px(10) }]}>
              {row.map(([name, width]) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    // Tapping the chip already chosen goes back to All.
                    setFilter((f) => (f === name ? 'All' : name));
                    setOpen(false);
                  }}
                  style={{ width: px(width), height: px(42), borderRadius: px(22), borderWidth: 1, borderColor: 'rgba(0,0,0,0.29)', alignItems: 'center', justifyContent: 'center', backgroundColor: filter === name ? 'rgba(0,178,255,0.15)' : undefined }}
                >
                  <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.regular, fontSize: px(14), lineHeight: px(17), color: colors.black }}>{name}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  panel: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.31)',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    elevation: 6,
  },
});
