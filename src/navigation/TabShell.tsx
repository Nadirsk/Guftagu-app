import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ChatsScreen from '../screens/chats/ChatsScreen';
import BottomNav, { type NavKey } from '../screens/home/BottomNav';
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import PartyScreen from '../screens/party/PartyScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { useFullAccess } from '../auth/access';
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
const SCREENS: Partial<Record<NavKey, (go: { openExplore: () => void; exploreFirst: boolean }) => React.ReactElement>> = {
  Home: ({ openExplore }) => <HomeFeedScreen onOpenExplore={openExplore} />,
  Party: ({ exploreFirst }) => <PartyScreen initialSection={exploreFirst ? 'Explore' : 'Related'} />,
  Chats: () => <ChatsScreen />,
  Mine: () => <ProfileScreen />,
};

export default function TabShell() {
  const fullAccess = useFullAccess();
  const [active, setActive] = useState<NavKey>('Home');
  // Set when Party was reached from the Live card, so it opens on Explore; the bar's own Party tap opens Related.
  const [exploreFirst, setExploreFirst] = useState(false);
  const render = SCREENS[active];

  return (
    <View style={styles.shell}>
      {render
        ? render({
            exploreFirst,
            openExplore: () => {
              setExploreFirst(true);
              setActive('Party');
            },
          })
        : null}
      <BottomNav
        active={active}
        // The Party and Chats frames draw the bar white (687:6916, 687:7071); the dark home keeps its own.
        tone={active === 'Party' || active === 'Chats' ? 'light' : 'dark'}
        disabled={fullAccess ? [] : ['Party', 'Chats', 'Mine']}
        onSelect={(key) => {
          if (!SCREENS[key]) return;
          if (!fullAccess && key !== 'Home') return;
          setExploreFirst(false);
          setActive(key);
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
