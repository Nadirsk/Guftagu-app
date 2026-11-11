import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import * as icons from '../../assets/wallet/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { BackTitle, BalanceCard, BalanceText, useUi } from './walletParts';

/**
 * Transfer (Figma 794:7871 and its dialog 797:7990, section 797:8041): find a person by ID or
 * nickname (`GET /search?type=users`), Transfer opens the amount dialog. The server has no
 * transfer endpoint yet, so Confirm only says so after checking the amount against the balance.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Wallet = { coin_balance: number; diamond_balance: number };
type Person = { uuid: string; guftagu_id: string | null; display_name: string | null; avatar_url: string | null };

const avatarPlaceholder = require('../../assets/wallet/transfer-avatar.png');

export default function TransferScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(() => peek<Wallet>('/wallet', token));
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<Person | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    return refresh<Wallet>('/wallet', token, setWallet);
  }, [token]);

  const search = async () => {
    const term = query.trim();
    if (!term || loading) return;
    setLoading(true);
    try {
      const data = await api<{ users: Person[] }>(`/search?type=users&limit=20&q=${encodeURIComponent(term)}`, { token });
      setPeople(data.users);
      setSearched(true);
    } catch (e) {
      setPeople([]);
      Alert.alert('Transfer', e instanceof ApiError ? e.displayMessage : 'Could not search right now.');
    } finally {
      setLoading(false);
    }
  };

  const balance = wallet?.diamond_balance ?? 0;
  const confirm = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) return Alert.alert('Transfer', 'Please enter amount.');
    if (n > balance) return Alert.alert('Transfer', 'You do not have that many diamonds.');
    Alert.alert('Transfer', 'Transfers open from the next update.');
  };
  const close = () => {
    setTarget(null);
    setAmount('');
  };

  return (
    <View style={styles.screen}>
      <BackTitle title="" onBack={() => navigation.goBack()} />
      <View style={[at(0, 92), { width: '100%', alignItems: 'center' }]}>
        <Text style={text(18, 'medium')}>Transfer</Text>
      </View>
      <Pressable onPress={() => navigation.navigate('CoinsHistory', { currency: 'diamond' })} hitSlop={px(10)} accessibilityLabel="History" style={[at(362, 91), { width: px(24), height: px(24) }]}>
        <SvgXml xml={icons.clockFading} width={px(24)} height={px(24)} />
      </Pressable>

      <BalanceCard>
        <BalanceText diamonds={balance} />
      </BalanceCard>

      {/* Frame 1597881157 — the search pill, and Search. */}
      <View style={[at(16, 344), { width: px(280), height: px(49), borderRadius: px(33), borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)', overflow: 'hidden' }]}>
        <SvgXml xml={icons.search} width={px(16)} height={px(16)} style={{ position: 'absolute', left: px(20), top: px(14) }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
          autoCapitalize="none"
          placeholder="Enter ID or nickname"
          placeholderTextColor="rgba(0,0,0,0.34)"
          underlineColorAndroid="transparent"
          style={[{ position: 'absolute', left: px(42), right: px(12), top: px(14), height: px(18), padding: 0, includeFontPadding: false }, text(14, 'regular')]}
        />
      </View>
      <Pressable onPress={search} style={[at(301, 349), { width: px(90), height: px(40), borderRadius: px(24), backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }]}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={text(14, 'regular', colors.white)}>Search</Text>}
      </Pressable>

      {/* Frame 1597881865 — people, 57 high with 22 between, from y 442. */}
      {people.map((p, i) => (
        <View key={p.uuid} style={[at(19, 442 + i * 79), { width: px(370), height: px(57) }]}>
          <Image source={p.avatar_url ? { uri: p.avatar_url } : avatarPlaceholder} style={{ width: px(57), height: px(57), borderRadius: px(28.5) }} />
          <Text numberOfLines={1} style={[at(65, 7), { width: px(180) }, text(16, 'medium')]}>
            {p.display_name ?? 'Guftagu user'}
          </Text>
          <Text numberOfLines={1} style={[at(65, 30), { width: px(180), opacity: 0.3 }, text(16, 'regular')]}>
            ID : {p.guftagu_id ?? '-'}
          </Text>
          <Pressable onPress={() => setTarget(p)} style={[at(260, 8.5), { width: px(110), height: px(40), borderRadius: px(9), backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={text(16, 'regular', colors.white)}>Transfer</Text>
          </Pressable>
        </View>
      ))}
      {searched && people.length === 0 && <Text style={[at(0, 442), { width: '100%', textAlign: 'center', opacity: 0.3 }, text(14, 'regular')]}>No one found</Text>}

      {/* Rectangle 161124139 + Frame 1597881730 — the amount dialog. */}
      {target && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.23)' }]}>
          <View style={[at(17, 232), { width: px(368), height: px(411), borderRadius: px(17), backgroundColor: colors.white, overflow: 'hidden' }]}>
            <Text style={[at(0, 35), { width: '100%', textAlign: 'center' }, text(16, 'medium')]}>Transfer</Text>
            {target.avatar_url ? (
              <Image source={{ uri: target.avatar_url }} style={[at(159.5, 72), { width: px(49), height: px(49), borderRadius: px(24.5) }]} />
            ) : (
              <View style={[at(159.5, 72), { width: px(49), height: px(49), borderRadius: px(24.5), backgroundColor: '#D9D9D9' }]} />
            )}
            <Text numberOfLines={1} style={[at(0, 128), { width: '100%', textAlign: 'center' }, text(18, 'regular')]}>
              {target.display_name ?? 'Guftagu user'}
            </Text>
            <Text style={[at(0, 154), { width: '100%', textAlign: 'center', opacity: 0.3 }, text(15, 'regular')]}>ID: {target.guftagu_id ?? '-'}</Text>

            <Text style={[at(25, 200), text(15, 'regular')]}>Transfer Amount</Text>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Please enter amount"
              placeholderTextColor="rgba(0,0,0,0.3)"
              underlineColorAndroid="transparent"
              style={[at(25, 234), { width: px(322), height: px(18), padding: 0, includeFontPadding: false }, text(14, 'medium')]}
            />
            <View style={[at(25, 259), { width: px(322), height: 1, backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            <Text style={[at(0, 278), { width: px(158), textAlign: 'center', opacity: 0.3 }, text(15, 'regular')]}>Balance : {balance}</Text>

            <View style={[at(55, 333), { flexDirection: 'row', gap: px(12) }]}>
              <Pressable onPress={close} style={{ width: px(123), height: px(37), borderRadius: px(21), borderWidth: 1, borderColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={text(15, 'regular')}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirm} style={{ width: px(123), height: px(37), borderRadius: px(21), backgroundColor: '#005DE9', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={text(15, 'regular', colors.white)}>Confirm</Text>
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
});
