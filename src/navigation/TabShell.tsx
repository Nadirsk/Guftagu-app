import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ChatsScreen from '../screens/chats/ChatsScreen';
import BottomNav, { type NavKey } from '../screens/home/BottomNav';
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import PartyScreen from '../screens/party/PartyScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { colors } from '../theme/tokens';

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
 * Party is the rooms list (Create Room is its "Create My Room" card). Chats is
 * the DM list and Contacts (514:3077 / 519:2450). Mine is the Profile.
 */
const SCREENS: Partial<Record<NavKey, () => React.ReactElement>> = {
  Home: () => <HomeFeedScreen />,
  Party: () => <PartyScreen />,
  Chats: () => <ChatsScreen />,
  Mine: () => <ProfileScreen />,
};

export default function TabShell() {
  const [active, setActive] = useState<NavKey>('Home');
  const render = SCREENS[active];

  return (
    <View style={styles.shell}>
      {render ? render() : null}
      <BottomNav
        active={active}
        // The Party and Chats frames draw the bar white (687:6916, 687:7071); the dark home keeps its own.
        tone={active === 'Party' || active === 'Chats' ? 'light' : 'dark'}
        onSelect={(key) => {
          if (SCREENS[key]) setActive(key);
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
