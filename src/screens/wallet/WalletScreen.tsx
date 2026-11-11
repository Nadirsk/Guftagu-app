import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import * as settingsIcons from '../../assets/settings/icons';
import * as icons from '../../assets/wallet/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Wallet — the Coin tab (188:966, with Google pay opened: 200:4721 and its buy dialog
 * 200:4892) and the Diamonds tab (Points, 204:5038; with Transfer, 794:7841). Withdraw, Exchange and
 * Transfer each open their own page. `GET /wallet` supplies the balances.
 * The coin packs come from `GET /recharge-packages` and Confirm credits them through
 * `POST /recharge-packages/{id}/purchase` (no payment gateway yet); the diamond packs
 * are still the design's own.
 */

const art = {
  card: require('../../assets/wallet/balance-card.png'),
  pointsCard: require('../../assets/wallet/points-card.png'),
  gpay: require('../../assets/wallet/gpay.png'),
  usdt: require('../../assets/wallet/usdt.png'),
  cards: require('../../assets/wallet/visa-sheet.png'),
  packCoins: require('../../assets/wallet/pack-coins.png'),
  gem: require('../../assets/wallet/gem.png'),
  withdraw: require('../../assets/wallet/withdraw.png'),
  exchange: require('../../assets/wallet/exchange.png'),
  flag: require('../../assets/flag-in.png'),
};

const RESELLERS = [
  { id: 1, photo: require('../../assets/wallet/reseller1.png'), whatsapp: false },
  { id: 2, photo: require('../../assets/wallet/reseller2.png'), whatsapp: true },
  { id: 3, photo: require('../../assets/wallet/reseller3.png'), whatsapp: true },
] as const;

/** `GET /recharge-packages` — what the server sells. */
type Pack = {
  id: number;
  name: string;
  coins: number;
  bonus_coins: number;
  total_coins: number;
  price_paise: number;
  is_first_purchase_only: boolean;
  badge_text: string | null;
};

const coinsText = (n: number) => n.toLocaleString('en-US');
const priceText = (paise: number) => `Rs ${(paise / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LINE = 1.28; // Delight's "normal" line height, as Poppins stands in for it.
const BAND = '#0A0909'; // the price strip under each pack
const BUY_RED = '#BD2727'; // the buy dialog's Confirm

type Wallet = { coin_balance: number; diamond_balance: number; lifetime_coins_purchased?: number };
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WalletScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'Wallet'>>();
  const [tab, setTab] = useState<'coin' | 'diamonds'>(route.params?.tab ?? 'coin');
  const [wallet, setWallet] = useState<Wallet | null>(() => peek<Wallet>('/wallet', token));
  // Google pay and USDT each open the same coin packs (one at a time); Visa has none yet.
  const [openMethod, setOpenMethod] = useState<'gpay' | 'usdt' | null>('gpay');
  const gpayOpen = openMethod !== null; // some method's packs are showing — the page geometry below follows it
  const [packs, setPacks] = useState<Pack[]>(() => peek<Pack[]>('/recharge-packages', token) ?? []);
  const [buying, setBuying] = useState<Pack | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stops = [
      refresh<Wallet>('/wallet', token, setWallet),
      refresh<Pack[]>('/recharge-packages', token, (rows) => setPacks(Array.isArray(rows) ? rows : [])),
    ];
    return () => stops.forEach((s) => s());
  }, [token]);

  // A first-recharge pack goes once the account has bought coins.
  const shownPacks = packs.filter((p) => !p.is_first_purchase_only || !(wallet?.lifetime_coins_purchased ?? 0));
  const packRows = Math.max(1, Math.ceil(shownPacks.length / 3));
  const cardHeight = 88 + packRows * 156;

  // Coins are credited straight away — there is no payment gateway to go through yet.
  const confirmBuy = async () => {
    if (!buying || busy) return;
    setBusy(true);
    try {
      const res = await api<{ coins_added: number; coin_balance: number }>(`/recharge-packages/${buying.id}/purchase`, { method: 'POST', token });
      setWallet((w) => ({ ...(w ?? { diamond_balance: 0 }), coin_balance: res.coin_balance, lifetime_coins_purchased: (w?.lifetime_coins_purchased ?? 0) + res.coins_added }));
      setBuying(null);
      Alert.alert('Recharge successful', `${coinsText(res.coins_added)} coins added to your wallet.`);
    } catch (e) {
      Alert.alert('Recharge', e instanceof ApiError ? e.displayMessage : 'Could not complete the recharge.');
    } finally {
      setBusy(false);
    }
  };

  const text = (size: number, weight: 'regular' | 'medium' | 'semiBold' = 'medium') => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: px(size),
    lineHeight: px(Math.round(size * LINE)),
    color: colors.black,
  });
  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });

  // Coin tab geometry: the methods are a 14-gap column from y 415; Resellers follows them.
  const methodsHeight = gpayOpen ? cardHeight + 14 + 65 + 14 + 65 : 65 * 3 + 14 * 2;
  const resellersTop = 415 + methodsHeight + (gpayOpen ? 32 : 37);
  const contentHeight = tab === 'coin' ? resellersTop + 42 + 291 + (gpayOpen ? 64 : 73) : 874;

  const header = (
    <>
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} accessibilityLabel="Back" style={[at(16, 91), { width: px(24), height: px(24) }]}>
        <SvgXml xml={icons.arrowBack} width={px(24)} height={px(24)} />
      </Pressable>
      {/* Coin / Diamonds — the selected one is solid, the other 40%. */}
      <Pressable onPress={() => setTab('coin')} style={[at(110.5 - 60, 92), { width: px(120), alignItems: 'center' }]}>
        <Text numberOfLines={1} style={[text(18, 'regular'), { textAlign: 'center', opacity: tab === 'coin' ? 1 : 0.4 }]}>Coin</Text>
      </Pressable>
      <Pressable onPress={() => setTab('diamonds')} style={[at(282.5 - 60, 92), { width: px(120), alignItems: 'center' }]}>
        <Text numberOfLines={1} style={[text(18, 'regular'), { textAlign: 'center', opacity: tab === 'diamonds' ? 1 : 0.4 }]}>Diamonds</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('CoinsHistory', { currency: tab === 'coin' ? 'coin' : 'diamond' })} hitSlop={px(10)} accessibilityLabel="History" style={[at(362, 91), { width: px(24), height: px(24) }]}>
        <SvgXml xml={icons.clockFading} width={px(24)} height={px(24)} />
      </Pressable>
    </>
  );

  // The ticket-shaped packs inside the opened Google pay card (Frame 1597881306…).
  const pack = (p: Pack, i: number) => {
    const coins = coinsText(p.total_coins);
    const price = priceText(p.price_paise);
    const first = i % 3 === 0;
    const height = first ? 130 : 131;
    const band = first ? 33 : 31;
    return (
      <Pressable key={p.id} onPress={() => setBuying(p)} style={{ width: px(100), height: px(height) }}>
        <SvgXml xml={first ? icons.ticketA : icons.ticketB} width={px(101.3)} height={px(first ? 121.3 : 132.3)} style={{ position: 'absolute', left: px(-0.65), top: px(-0.65) }} />
        <View style={[at(29, 22), { width: px(42), height: px(30), overflow: 'hidden' }]}>
          <Image source={art.packCoins} resizeMode="stretch" style={{ position: 'absolute', left: px(42 * 0.0196), top: 0, width: px(42 * 0.9408), height: px(30) }} />
        </View>
        <Text numberOfLines={1} style={[at(0, first ? 61 : 63), text(14, 'semiBold'), { width: px(100), textAlign: 'center' }]}>{coins}</Text>
        {p.badge_text || p.bonus_coins > 0 ? (
          <Text numberOfLines={1} style={[at(0, first ? 80 : 82), text(10, 'regular'), { width: px(100), textAlign: 'center', color: BUY_RED }]}>
            {p.badge_text ?? `+${coinsText(p.bonus_coins)} bonus`}
          </Text>
        ) : null}
        <View style={[at(0, 100), { width: px(100), height: px(band), backgroundColor: BAND, borderBottomLeftRadius: px(7), borderBottomRightRadius: px(7), alignItems: 'center', justifyContent: 'center' }]}>
          <Text numberOfLines={1} style={[text(13, 'semiBold'), { color: colors.white }]}>{price}</Text>
        </View>
      </Pressable>
    );
  };

  const coinTab = (
    <>
      {/* Frame 2109 — the balance card. */}
      <View style={[at(15, 163), { width: px(372), height: px(145), borderRadius: px(10), overflow: 'hidden', backgroundColor: colors.white }]}>
        <Image source={art.card} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: px(372), height: px(145) }} />
        <Text style={[at(22, 26), text(17), { color: colors.white }]}>Current Balance</Text>
        <Text style={[at(22, 63), { fontFamily: typography.fontFamily.semiBold, fontSize: px(38), lineHeight: px(57), color: colors.white }]}>
          {wallet?.coin_balance ?? 0}
        </Text>
      </View>

      {/* Frame 1597881278 — Payment Method, with the country chip. */}
      <Text style={[at(16, 353.5), text(18)]}>Payment Method</Text>
      <View style={[at(284, 348), styles.chip, { width: px(102), height: px(34), borderRadius: px(23) }]}>
        <Image source={art.flag} resizeMode="stretch" style={{ position: 'absolute', left: px(15), top: px(8.5), width: px(28), height: px(16) }} />
        <Text style={[at(49, 5), text(15), { opacity: 0.5 }]}>IN</Text>
        {/* Vector 188:1019: a 10 x 4.6 box, centred (93, 17), the 6.09 x 11.5 export turned 90°. */}
        <SvgXml xml={icons.chevronDown} width={px(6.0946)} height={px(11.5)} style={{ position: 'absolute', left: px(93 - 3.0473), top: px(17 - 5.75), transform: [{ rotate: '90deg' }] }} />
      </View>

      {/* Frame 1597881281 — Google pay and USDT (each opens the packs), Visa. */}
      <View style={[at(16, 415), { width: px(370), gap: px(14) }]}>
        {(['gpay', 'usdt'] as const).map((key) => {
          const open = openMethod === key;
          return (
            <View key={key} style={[styles.row, { height: px(open ? cardHeight : 65), borderRadius: px(9), borderColor: 'rgba(0,0,0,0.2)' }]}>
              <Pressable onPress={() => setOpenMethod(open ? null : key)} style={{ position: 'absolute', left: 0, top: 0, width: px(368), height: px(63) }}>
                {key === 'gpay' ? (
                  <Image source={art.gpay} style={{ position: 'absolute', left: px(17), top: px(15), width: px(31), height: px(31) }} />
                ) : (
                  <Image source={art.usdt} style={{ position: 'absolute', left: px(16), top: px(16), width: px(35), height: px(35) }} />
                )}
                <Text style={[at(key === 'gpay' ? 59 : 60, key === 'gpay' ? 20.5 : 22), text(16)]}>{key === 'gpay' ? 'Google pay' : 'USDT- TRX'}</Text>
                <SvgXml
                  xml={settingsIcons.chevronForward}
                  width={px(24)}
                  height={px(24)}
                  style={{ position: 'absolute', left: px(333), top: px(open ? 15.5 : 20), transform: open ? [{ rotate: '90deg' }] : [] }}
                />
              </Pressable>
              {open &&
                Array.from({ length: packRows }, (_, r) => (
                  <View key={r} style={[at(17, 71 + r * 156), { flexDirection: 'row', gap: px(17) }]}>
                    {shownPacks.slice(r * 3, r * 3 + 3).map((p, i) => pack(p, i))}
                  </View>
                ))}
            </View>
          );
        })}
        <Pressable style={[styles.row, { height: px(65), borderRadius: px(9), borderColor: 'rgba(0,0,0,0.2)' }]}>
          <View style={{ position: 'absolute', left: px(16), top: px(21), width: px(52.174), height: px(25), overflow: 'hidden' }}>
            <Image source={art.cards} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: px(-0.602 * 25), width: px(52.174), height: px(25 * 2.2475) }} />
          </View>
          <Text style={[at(75, 22), text(16)]}>Visa /Master</Text>
          <SvgXml xml={settingsIcons.chevronForward} width={px(24)} height={px(24)} style={{ position: 'absolute', left: px(333), top: px(21) }} />
        </Pressable>
      </View>

      <Text style={[at(16, resellersTop), text(16)]}>Resellers</Text>

      {/* Frame 1597881284 — reseller cards. */}
      <View style={[at(16, resellersTop + 42), { width: px(370), gap: px(15) }]}>
        {RESELLERS.map((r) => (
          <View key={r.id} style={[styles.row, { height: px(87), borderRadius: px(11), borderColor: 'rgba(0,0,0,0.14)' }]}>
            <Image source={r.photo} style={{ position: 'absolute', left: px(21), top: px(14), width: px(57), height: px(57), borderRadius: px(28.5) }} />
            <Text numberOfLines={1} style={[at(95, 20), text(16), { width: px(123) }]}>Official Su..</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[at(95, 46), text(16, 'regular'), { width: px(130), opacity: 0.4 }]}>+912844594950</Text>
            <Text numberOfLines={1} style={[at(216, 16), text(16, 'regular'), { width: px(140), textAlign: 'right', opacity: 0.3 }]}>ID : 6595974</Text>
            <SvgXml xml={icons.copy} width={px(18)} height={px(18)} style={{ position: 'absolute', left: px(227), top: px(47) }} />
            {r.whatsapp && <SvgXml xml={icons.whatsapp} width={px(20)} height={px(20)} style={{ position: 'absolute', left: px(304), top: px(49) }} />}
            <Image source={art.flag} resizeMode="stretch" style={{ position: 'absolute', left: px(330), top: px(50), width: px(25), height: px(16) }} />
          </View>
        ))}
      </View>
    </>
  );

  // Points (204:5038): the Diamonds tab.
  const actionCard = (left: number, label: string, onPress: () => void, picture: React.ReactNode, top = 357) => (
    <Pressable
      onPress={onPress}
      style={[
        at(left, top),
        styles.actionCard,
        { width: px(166), height: px(184), borderRadius: px(13), shadowOffset: { width: px(5), height: px(5) }, shadowRadius: px(9.8) },
      ]}
    >
      <Text style={[at(19, 139), text(18, 'semiBold')]}>{label}</Text>
      <View style={[at(19, 14), { width: px(83), height: px(119), overflow: 'hidden' }]}>{picture}</View>
      <SvgXml xml={settingsIcons.chevronForward} width={px(29)} height={px(29)} style={{ position: 'absolute', left: px(131), top: px(13) }} />
    </Pressable>
  );

  const diamondsTab = (
    <>
      <View style={[at(15, 167), { width: px(372), height: px(145), borderRadius: px(10), overflow: 'hidden', backgroundColor: colors.white }]}>
        <Image source={art.pointsCard} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: px(372), height: px(145) }} />
        <Text style={[at(131, 27), text(18), { width: px(109), textAlign: 'center', color: colors.white }]}>Balance</Text>
        <View style={[at(131, 67), { width: px(54), height: px(45), overflow: 'hidden' }]}>
          <Image source={art.gem} resizeMode="stretch" style={{ position: 'absolute', left: px(-54 * 0.0899), top: 0, width: px(54 * 1.0317), height: px(45) }} />
        </View>
        <Text style={[at(193, 61), { fontFamily: typography.fontFamily.semiBold, fontSize: px(38), lineHeight: px(57), color: colors.white }]}>
          {wallet?.diamond_balance ?? 0}
        </Text>
      </View>
      {actionCard(
        16,
        'Withdraw',
        () => navigation.navigate('Withdraw'),
        <Image source={art.withdraw} resizeMode="cover" style={{ width: px(83), height: px(119) }} />,
      )}
      {/* Transfer (794:7865): the same picture as Withdraw, under it. */}
      {actionCard(
        16,
        'Transfer',
        () => navigation.navigate('Transfer'),
        <Image source={art.withdraw} resizeMode="cover" style={{ width: px(83), height: px(119) }} />,
        554,
      )}
      {actionCard(
        192,
        'Exchange',
        () => navigation.navigate('Exchange'),
        <Image source={art.exchange} resizeMode="stretch" style={{ position: 'absolute', left: px(-0.2162 * 83), top: px(-0.2689 * 119), width: px(1.4865 * 83), height: px(1.5566 * 119) }} />,
      )}
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={{ height: px(contentHeight) }} showsVerticalScrollIndicator={false}>
        {header}
        {tab === 'coin' ? coinTab : diamondsTab}
      </ScrollView>

      {/* Rectangle 161124112 + Frame 1597881181 — "Buy : 42,000 ?". */}
      {buying !== null && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(1,1,1,0.22)' }]}>
          <View style={[at(49, 432), { width: px(304), height: px(142), borderRadius: px(10), backgroundColor: colors.white, overflow: 'hidden' }]}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: px(29), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: px(5) }}>
              <Text style={text(16)}>Buy : {coinsText(buying.total_coins)} ?</Text>
              <View style={{ width: px(30), height: px(21), overflow: 'hidden' }}>
                <Image source={art.packCoins} resizeMode="stretch" style={{ position: 'absolute', left: px(30 * 0.0196), top: 0, width: px(30 * 0.9408), height: px(21) }} />
              </View>
            </View>
            <View style={[at(34.5, 81), { flexDirection: 'row', gap: px(12) }]}>
              <Pressable onPress={() => setBuying(null)} style={[styles.dialogButton, { width: px(112), height: px(44), borderRadius: px(9), borderWidth: 1, borderColor: 'rgba(0,0,0,0.13)' }]}>
                <Text style={text(15, 'regular')}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmBuy} disabled={busy} style={[styles.dialogButton, { width: px(112), height: px(44), borderRadius: px(9), backgroundColor: BUY_RED, opacity: busy ? 0.6 : 1 }]}>
                <Text style={[text(15, 'regular'), { color: colors.white }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  chip: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.47)', overflow: 'hidden' },
  row: { width: '100%', borderWidth: 1, overflow: 'hidden', backgroundColor: colors.white },
  actionCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.21)',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  dialogButton: { alignItems: 'center', justifyContent: 'center' },
});
