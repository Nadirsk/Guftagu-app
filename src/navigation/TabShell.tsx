import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import BottomNav, { type NavKey } from '../screens/home/BottomNav';
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import MomentScreen from '../screens/moment/MomentScreen';
import { colors } from '../theme/tokens';

/**
 * The app shell — node 15:307's bar, mounted once.
 *
 * The bar is not part of any screen: it lives here, and switching tabs only
 * swaps what is drawn above it. Screens therefore never render a `<BottomNav>`
 * themselves; they only keep `BOTTOM_NAV_HEIGHT` of their scroll content clear
 * so nothing ends up underneath it.
 *
 * Anything pushed on top of the shell — Search, Post a moment — covers the bar,
 * which is what those frames draw. See RootNavigator.
 */

/** Chat and Me have no screens yet, so their tabs stay inert. */
const SCREENS: Partial<Record<NavKey, () => React.ReactElement>> = {
  Home: () => <HomeFeedScreen />,
  Moment: () => <MomentScreen />,
};

export default function TabShell() {
  const [active, setActive] = useState<NavKey>('Home');
  const render = SCREENS[active];

  return (
    <View style={styles.shell}>
      {render ? render() : null}
      <BottomNav
        active={active}
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
    backgroundColor: colors.white,
  },
});
