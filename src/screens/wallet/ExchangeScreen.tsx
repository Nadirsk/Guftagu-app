import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import * as icons from '../../assets/wallet/icons';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Exchange — Points into Coins. The entry state (Figma 205:5143) types the amount on the
 * design's dark keypad; the black disc moves to the confirm state (209:7154) with its
 * Cancel / Confirm. Confirm calls `POST /wallet/exchange` (points = diamonds). The rate below
 * (122 points → 2 coins in the design) is a placeholder and must match
 * `guftagu.diamonds_per_coin` on the server.
 */

const EXCHANGE_RATE = 5; // points (diamonds) per coin; same as guftagu.diamonds_per_coin on the server
const KEY_FILL = '#6B6B6B'; // Dark/Primary Key Background
const KEYBOARD_FILL = 'rgba(21,21,21,0.85)';
const LINE = 1.28;

const art = {
  gem: require('../../assets/wallet/gem.png'),
  coin: require('../../assets/wallet/coin.png'),
};

// Column x and row y of the 375 x 291 keypad, with the letters under each digit.
const COLS = [6, 129, 252] as const;
const ROWS = [
  { top: 6, height: 46 },
  { top: 59, height: 47 },
  { top: 113, height: 47 },
  { top: 167, height: 46 },
] as const;
const KEYS: { digit: string; letters: string; col: number; row: number }[] = [
  { digit: '1', letters: '', col: 0, row: 0 },
  { digit: '2', letters: 'abc', col: 1, row: 0 },
  { digit: '3', letters: 'def', col: 2, row: 0 },
  { digit: '4', letters: 'ghi', col: 0, row: 1 },
  { digit: '5', letters: 'jkl', col: 1, row: 1 },
  { digit: '6', letters: 'mno', col: 2, row: 1 },
  { digit: '7', letters: 'pqrs', col: 0, row: 2 },
  { digit: '8', letters: 'tuv', col: 1, row: 2 },
  { digit: '9', letters: 'wxyz', col: 2, row: 2 },
  { digit: '0', letters: '', col: 1, row: 3 },
];

type Wallet = { coin_balance: number; diamond_balance: number };

export default function ExchangeScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const { token } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(() => peek<Wallet>('/wallet', token));
  const [digits, setDigits] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    return refresh<Wallet>('/wallet', token, setWallet);
  }, [token]);

  const points = digits === '' ? 0 : Number(digits);
  const coins = Math.floor(points / EXCHANGE_RATE);
  const press = (d: string) => setDigits((cur) => (cur === '' && d === '0' ? cur : (cur + d).slice(0, 9)));

  // Opening the confirm step only makes sense with something to exchange and enough to spend.
  const openConfirm = () => {
    if (coins < 1) return Alert.alert('Exchange', `Enter at least ${EXCHANGE_RATE} to get 1 coin.`);
    if (wallet && points > wallet.diamond_balance) return Alert.alert('Exchange', 'You do not have that many points.');
    setConfirming(true);
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Whole multiples only; the server keeps any remainder in the wallet.
      const res = await api<{ coins_added: number; coin_balance: number; diamond_balance: number }>('/wallet/exchange', {
        method: 'POST',
        token,
        body: { diamonds: coins * EXCHANGE_RATE },
      });
      setWallet((w) => ({ ...(w as Wallet), coin_balance: res.coin_balance, diamond_balance: res.diamond_balance }));
      setDigits('');
      setConfirming(false);
      Alert.alert('Exchange', `${res.coins_added} coins added to your balance.`);
    } catch (e) {
      Alert.alert('Exchange', e instanceof ApiError ? e.displayMessage : 'Could not complete the exchange.');
    } finally {
      setBusy(false);
    }
  };

  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });
  const text = (size: number, weight: 'regular' | 'medium' | 'semiBold' = 'regular') => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: px(size),
    lineHeight: px(Math.round(size * LINE)),
    color: colors.black,
  });

  const card = { width: px(368), height: px(142), borderRadius: px(11), overflow: 'hidden' as const, backgroundColor: 'rgba(0,0,0,0.08)' };
  const pill = { height: px(47), borderRadius: px(27), alignItems: 'center' as const, justifyContent: 'center' as const };

  // The two cards sit 8 lower and 1 right in the confirm state.
  const x = confirming ? 17 : 16;
  const y1 = confirming ? 163 : 155;
  const y2 = confirming ? 310 : 302;
  const disc = confirming ? { left: 312, top: 282 } : { left: 311, top: 274 };

  return (
    <View style={styles.screen}>
      {/* Frame 1597881319 — arrow_back + title, and the clock. */}
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} style={[at(16, 91), { flexDirection: 'row', alignItems: 'flex-end', gap: px(18) }]}>
        <SvgXml xml={icons.arrowBack} width={px(24)} height={px(24)} />
        <Text style={text(18, 'medium')}>Exchange</Text>
      </Pressable>
      <View style={[at(362, 91), { width: px(24), height: px(24) }]}>
        <SvgXml xml={icons.clockFading} width={px(24)} height={px(24)} />
      </View>

      {/* Frame 1597881329 — Points. */}
      <View style={[at(x, y1), card]}>
        <Text style={[at(19, 31), text(16)]}>Points</Text>
        <Text numberOfLines={1} style={[at(19, 61), { width: px(250), fontFamily: typography.fontFamily.semiBold, fontSize: px(40), lineHeight: px(51), color: colors.black }]}>
          {points}
        </Text>
        <View style={[at(299, 50.5), { width: px(51), height: px(42), overflow: 'hidden' }]}>
          <Image source={art.gem} resizeMode="stretch" style={{ position: 'absolute', left: px(-51 * 0.0899), top: 0, width: px(51 * 1.0317), height: px(42) }} />
        </View>
      </View>

      {/* Frame 1597881330 — Coins. */}
      <View style={[at(x, y2), card]}>
        <Text style={[at(26, 30), text(16)]}>Coins</Text>
        <Text numberOfLines={1} style={[at(26, 60), { width: px(250), fontFamily: typography.fontFamily.semiBold, fontSize: px(40), lineHeight: px(51), color: colors.black }]}>
          {coins}
        </Text>
        <Image source={art.coin} style={[at(306, 45.5), { width: px(50), height: px(50) }]} />
      </View>

      {/* Ellipse 1981 + arrow: the black disc between them. */}
      <Pressable onPress={openConfirm} style={[at(disc.left, disc.top), { width: px(52), height: px(52) }]} accessibilityLabel="Exchange">
        <SvgXml xml={icons.swapDisc} width={px(52)} height={px(52)} />
        <SvgXml xml={icons.arrowBackWhite} width={px(24)} height={px(24)} style={{ position: 'absolute', left: px(14), top: px(14), transform: [{ rotate: '-90deg' }] }} />
      </Pressable>

      {confirming ? (
        <>
          {/* Frame 8981 / 8982 — Cancel, Confirm. */}
          <Pressable onPress={() => setConfirming(false)} style={[at(16, 768), pill, { width: px(181), backgroundColor: 'rgba(0,0,0,0.12)' }]}>
            <Text style={[text(17), { opacity: 0.5 }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={confirm}
            disabled={busy}
            style={[at(202, 768), pill, { width: px(187), backgroundColor: colors.black, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={[text(17), { color: '#FFFDFD' }]}>Confirm</Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Frame 1597881315 — My Balance. */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: px(491), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(12) }}>
            <Image source={art.coin} style={{ width: px(36), height: px(36) }} />
            <Text style={[text(18), { opacity: 0.3 }]}>My Balance : {wallet?.coin_balance ?? 0}</Text>
          </View>

          {/* Keyboard (207:5701). */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: px(555), bottom: 0, backgroundColor: KEYBOARD_FILL }}>
            <View style={{ position: 'absolute', left: px(13.5), top: px(21), width: px(375), height: px(291) }}>
              {KEYS.map((k) => {
                const row = ROWS[k.row];
                const frame = { position: 'absolute' as const, left: px(COLS[k.col]), top: px(row.top), width: px(117), height: px(row.height) };
                return (
                  <View key={k.digit} style={frame}>
                    <View style={{ position: 'absolute', left: 0, top: px(1), width: px(117), height: px(row.height), borderRadius: px(5), backgroundColor: 'rgba(0,0,0,0.3)' }} />
                    <Pressable onPress={() => press(k.digit)} style={[styles.key, { height: px(row.height) }]}>
                      <Text style={[styles.digit, { fontSize: px(25), lineHeight: px(30), top: px(k.letters ? 1 : 7) }]}>{k.digit}</Text>
                      {k.letters !== '' && <Text style={[styles.letters, { fontSize: px(10), lineHeight: px(12), top: px(row.height - 17) }]}>{k.letters}</Text>}
                    </Pressable>
                  </View>
                );
              })}
              {/* Backspace (Icon 32 x 32, no key fill). */}
              <Pressable
                onPress={() => setDigits((cur) => cur.slice(0, -1))}
                accessibilityLabel="Delete"
                style={{ position: 'absolute', left: px(COLS[2]), top: px(167), width: px(117), height: px(46), alignItems: 'center', justifyContent: 'center' }}
              >
                <SvgXml xml={icons.backspace} width={px(32)} height={px(32)} />
              </Pressable>
              {/* Home Indicator. */}
              <View style={{ position: 'absolute', left: px(121), top: px(278), width: px(134), height: px(5), borderRadius: px(100), backgroundColor: colors.white }} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  key: { position: 'absolute', left: 0, top: 0, width: '100%', borderRadius: 5, backgroundColor: KEY_FILL, alignItems: 'center' },
  digit: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: colors.white },
  letters: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: colors.white, fontWeight: '700', letterSpacing: 2 },
});
