import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import { api } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import * as icons from '../../assets/wallet/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { BackTitle, BalanceCard, BalanceText, BlackButton, PickerBox, useUi } from './walletParts';
import { METHOD_LABEL, useLinkedMethod } from './withdrawMethods';

/**
 * Withdraw (Figma 339:3066, section 346:6627): the Diamonds wallet's Withdraw card. The method box
 * opens the method pages; Withdraw itself waits for the server — it has no dollar rate, and
 * `POST /withdrawals` takes diamonds, not dollars — so it only says so once everything is filled in.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Wallet = { coin_balance: number; diamond_balance: number };

export default function WithdrawScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const linked = useLinkedMethod();
  const [wallet, setWallet] = useState<Wallet | null>(() => peek<Wallet>('/wallet', token));
  const [amount, setAmount] = useState('');

  useEffect(() => {
    return refresh<Wallet>('/wallet', token, setWallet);
  }, [token]);

  const withdraw = () => {
    if (!linked) return Alert.alert('Withdraw', 'Select a withdrawal method first.');
    if (!amount.trim()) return Alert.alert('Withdraw', 'Enter the amount to withdraw.');
    Alert.alert('Withdraw', 'Withdrawals open from the next update.');
  };

  return (
    <View style={styles.screen}>
      <BackTitle title="" onBack={() => navigation.goBack()} />
      {/* Coin / Points — "Points" is the page, "Coin" the other wallet tab at 40%. */}
      <Pressable onPress={() => navigation.navigate('Wallet', { tab: 'coin' })} style={[at(110.5 - 60, 92), { width: px(120), alignItems: 'center' }]}>
        <Text numberOfLines={1} style={[text(18, 'regular'), { textAlign: 'center', opacity: 0.4 }]}>Coin</Text>
      </Pressable>
      <View style={[at(282 - 60, 92), { width: px(120), alignItems: 'center' }]}>
        <Text numberOfLines={1} style={[text(18, 'medium'), { textAlign: 'center' }]}>Points</Text>
      </View>
      <Pressable onPress={() => navigation.navigate('CoinsHistory', { currency: 'diamond' })} hitSlop={px(10)} accessibilityLabel="History" style={[at(362, 91), { width: px(24), height: px(24) }]}>
        <SvgXml xml={icons.clockFading} width={px(24)} height={px(24)} />
      </Pressable>

      <BalanceCard>
        <BalanceText diamonds={wallet?.diamond_balance ?? 0} />
      </BalanceCard>

      <Text style={[at(15, 340), text(16, 'semiBold')]}>Withdrawal method</Text>
      <PickerBox
        top={373}
        value={linked ? `${METHOD_LABEL[linked.kind]} · ${linked.title}` : undefined}
        placeholder="Select withdrawal method"
        onPress={() => navigation.navigate('WithdrawMethod')}
      />

      {/* "USD Balance" is the amount's field; Line 92 is its underline, 20% black. */}
      <TextInput
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="USD Balance"
        placeholderTextColor="rgba(0,0,0,0.3)"
        underlineColorAndroid="transparent"
        style={[at(15, 468), { width: px(372), height: px(18), padding: 0, includeFontPadding: false }, text(14, 'medium')]}
      />
      <View style={[at(15, 496), { width: px(372), height: 1, backgroundColor: 'rgba(0,0,0,0.2)' }]} />
      <Text style={[at(122, 517), text(14, 'regular'), { opacity: 0.3 }]}>Minimum withdrawal is $5</Text>

      <BlackButton label="Withdraw" onPress={withdraw} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
