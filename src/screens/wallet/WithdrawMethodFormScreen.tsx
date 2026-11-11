import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/wallet/icons';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { BackTitle, BlackButton, FIELD_BORDER, Field, useUi } from './walletParts';
import { linkMethod } from './withdrawMethods';

/**
 * Link a withdrawal method: UPI (Figma 345:6470), Bank (345:6519) or Binance (345:6548). Confirm
 * keeps the method for the session and goes back to the method page, which shows "Withdrawal method
 * added". Nothing is sent anywhere yet — the server has no linked methods.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WithdrawMethodFormScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { kind } = useRoute<RouteProp<RootStackParamList, 'WithdrawMethodForm'>>().params;

  const [upi, setUpi] = useState('');
  const [bank, setBank] = useState({ last: '', first: '', name: '', card: '', phone: '' });
  const [address, setAddress] = useState('');
  const [qr, setQr] = useState<string | null>(null);

  const pickQr = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!picked.canceled && picked.assets[0]) setQr(picked.assets[0].uri);
  };

  const confirm = () => {
    if (kind === 'upi') {
      if (!upi.trim()) return Alert.alert('UPI', 'Enter your UPI account or mobile number.');
      linkMethod({ kind, title: upi.trim(), subtitle: 'UPI' });
    } else if (kind === 'bank') {
      const missing = Object.values(bank).some((v) => !v.trim());
      if (missing) return Alert.alert('Bank', 'Fill in every field.');
      const card = bank.card.replace(/\s/g, '');
      linkMethod({ kind, title: bank.name.trim(), subtitle: `Card ending ${card.slice(-4)}` });
    } else {
      if (!address.trim()) return Alert.alert('Binance', 'Enter your Binance address.');
      linkMethod({ kind, title: 'Binance', subtitle: `TRC20 · ${address.trim().slice(0, 12)}…` });
    }
    navigation.navigate('WithdrawMethod');
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ height: px(874) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackTitle title="Withdrawal method" onBack={() => navigation.goBack()} />

        {kind === 'upi' && (
          <Field top={155} label="Account" labelWeight="semiBold" value={upi} onChangeText={setUpi} placeholder="Please enter UPI account or mobile number" autoCapitalize="none" />
        )}

        {kind === 'bank' && (
          <>
            <Field top={172} label="Recipient last name" value={bank.last} onChangeText={(v) => setBank({ ...bank, last: v })} placeholder="enter name" />
            <Field top={286} label="Recipient first name" value={bank.first} onChangeText={(v) => setBank({ ...bank, first: v })} placeholder="enter name" />
            <Field top={400} label="Bank name" value={bank.name} onChangeText={(v) => setBank({ ...bank, name: v })} placeholder="Enter Bank Name" />
            <Field top={514} label="Cardholder bank card number" value={bank.card} onChangeText={(v) => setBank({ ...bank, card: v.replace(/[^0-9 ]/g, '') })} placeholder="Enter card number" keyboardType="number-pad" />
            <Field top={628} label="Phone number" value={bank.phone} onChangeText={(v) => setBank({ ...bank, phone: v.replace(/[^0-9+ ]/g, '') })} placeholder="Enter Number" keyboardType="phone-pad" />
          </>
        )}

        {kind === 'binance' && (
          <>
            <Text style={[at(20, 137), { width: px(357), opacity: 0.3 }, text(16, 'regular')]}>
              The linked Binance account will be used to receive salary. please enter the correct Binance account
            </Text>
            {/* Frame 1597881419 — the QR box: 181 x 177, a dashed blue outline, the camera in the middle. */}
            <Pressable
              onPress={pickQr}
              accessibilityLabel="Add your QR code"
              style={[at(111, 216), { width: px(181), height: px(177), borderRadius: px(12), borderWidth: 1, borderStyle: 'dashed', borderColor: '#006FFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}
            >
              {qr ? <Image source={{ uri: qr }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <SvgXml xml={icons.camera} width={px(50)} height={px(50)} />}
            </Pressable>
            <Text style={[at(153, 417), text(16, 'regular')]}>Your QR code</Text>
            <Text style={[at(15, 468), text(16, 'medium')]}>Selected network</Text>
            <View style={[at(15, 498), { width: px(372), height: px(59), borderRadius: px(11), borderWidth: 1, borderColor: FIELD_BORDER, justifyContent: 'center' }]}>
              <Text style={[text(14, 'medium'), { marginLeft: px(13), opacity: 0.4 }]}>TRC20</Text>
            </View>
            <Field top={582} label=" Address" boxHeight={114} value={address} onChangeText={setAddress} placeholder="Enter address" autoCapitalize="none" />
          </>
        )}
      </ScrollView>

      <BlackButton label="Confirm" onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
