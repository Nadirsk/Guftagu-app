import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

/**
 * Placeholder landing screen — this is where sign-in and profile setup hand off
 * to, so the flow has an end. Replace with the real home design when it lands.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { px } = useDesignScale();
  const { user, signOut } = useAuth();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + px(40) }]}>
      <Text style={[styles.greeting, { fontSize: px(24) }]}>
        Welcome{user?.display_name ? `, ${user.display_name}` : ''}
      </Text>

      {user?.guftagu_id ? (
        <Text style={[styles.meta, { fontSize: px(15) }]}>ID {user.guftagu_id}</Text>
      ) : null}

      <Text style={[styles.meta, { fontSize: px(15) }]}>Home screen coming soon</Text>

      <Pressable
        onPress={signOut}
        style={[
          styles.signOut,
          { height: px(50), borderRadius: px(25), paddingHorizontal: px(32) },
        ]}
      >
        <Text style={[styles.signOutLabel, { fontSize: px(16) }]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    gap: 12,
  },
  greeting: {
    fontFamily: typography.fontFamily.bold,
    color: colors.black,
  },
  meta: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  signOut: {
    marginTop: 24,
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  signOutLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
});
