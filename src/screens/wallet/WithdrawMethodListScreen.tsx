import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { BackTitle, BlackButton, MethodRow } from './walletParts';
import { METHOD_LABEL, type MethodKind } from './withdrawMethods';

/**
 * Withdrawal method list (Figma 340:3139): Binance, Bank and UPI, each with its service fee and a
 * Link pill that opens that method's form. The rows are 63 high with 21 between them, from y 156.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

const KINDS: MethodKind[] = ['binance', 'bank', 'upi'];

export default function WithdrawMethodListScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <View style={styles.screen}>
      <BackTitle title="Withdrawal method" onBack={() => navigation.goBack()} />
      {KINDS.map((kind, i) => (
        <MethodRow
          key={kind}
          top={156 + i * 84}
          kind={kind}
          title={METHOD_LABEL[kind]}
          subtitle="Service Fee : 5%"
          action="Link"
          onAction={() => navigation.navigate('WithdrawMethodForm', { kind })}
        />
      ))}
      <BlackButton label="Confirm" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
