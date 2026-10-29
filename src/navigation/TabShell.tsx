import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import BottomNav, { type NavKey } from '../screens/home/BottomNav';
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { colors } from '../theme/tokens';
import type { RootStackParamList } from './types';

/**
 * The app shell — node 687:6679's bar, mounted once.
 *
 * The bar is not part of any screen: it lives here, and switching tabs only
 * swaps what is drawn above it. Screens therefore never render a `<BottomNav>`
 * themselves; they only keep `BOTTOM_NAV_HEIGHT` of their scroll content clear
 * so nothing ends up underneath it.
 *
 * Anything pushed on top of the shell — Search, Post Details — covers the bar.
 * See RootNavigator.
 */

/**
 * Chats has no screen yet, so its tab stays inert. Party has no tab screen either;
 * for now it opens Create Room on top of the shell. Mine is the Profile.
 */
const SCREENS: Partial<Record<NavKey, () => React.ReactElement>> = {
  Home: () => <HomeFeedScreen />,
  Mine: () => <ProfileScreen />,
};

export default function TabShell() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [active, setActive] = useState<NavKey>('Home');
  const render = SCREENS[active];

  return (
    <View style={styles.shell}>
      {render ? render() : null}
      <BottomNav
        active={active}
        onSelect={(key) => {
          if (key === 'Party') navigation.navigate('CreateRoom');
          else if (SCREENS[key]) setActive(key);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
