import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';

import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { BackTitle, BlackButton, MethodRow, PickerBox, Toast, useUi } from './walletParts';
import { takeJustLinked, unlinkMethod, useLinkedMethod } from './withdrawMethods';

/**
 * Withdrawal method (Figma 340:3104 empty, 345:6493 with a method linked, and the "Withdrawal method
 * added" toast 345:6491). The box at the top opens the list of methods to link.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WithdrawMethodScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const linked = useLinkedMethod();
  const [toast, setToast] = useState(false);

  // Coming back from a link form shows the toast once, then it goes.
  useFocusEffect(
    useCallback(() => {
      if (!takeJustLinked()) return;
      setToast(true);
      const t = setTimeout(() => setToast(false), 2200);
      return () => clearTimeout(t);
    }, []),
  );

  const confirm = () => {
    if (!linked) return Alert.alert('Withdrawal method', 'Link a withdrawal method first.');
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <BackTitle title="Withdrawal method" onBack={() => navigation.goBack()} />
      <PickerBox top={153} placeholder="Select withdrawal method" onPress={() => navigation.navigate('WithdrawMethodList')} />

      {linked ? (
        <MethodRow top={250} left={24} kind={linked.kind} title={linked.title} subtitle={linked.subtitle} action="UnLink" onAction={unlinkMethod} />
      ) : (
        /* Frame 1597881401 — the picture, cropped to 192 x 180, and "Nothing here" 15 below. */
        <View style={[at(105, 330), { width: px(192) }]}>
          <View style={{ width: px(192), height: px(180), overflow: 'hidden' }}>
            <Image
              source={require('../../assets/wallet/withdraw-empty.png')}
              resizeMode="stretch"
              style={{ position: 'absolute', left: px(-0.0833 * 192), top: px(-0.15 * 180), width: px(1.2292 * 192), height: px(1.3111 * 180) }}
            />
          </View>
          <Text style={[text(16, 'semiBold'), { marginTop: px(15), textAlign: 'center' }]}>Nothing here</Text>
        </View>
      )}

      <BlackButton label="Confirm" onPress={confirm} />
      {toast && <Toast message="Withdrawal method added" />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
