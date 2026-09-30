import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import EmailAuthScreen from '../screens/EmailAuthScreen';
import HomeScreen from '../screens/HomeScreen';
import MediaViewerScreen from '../screens/moment/MediaViewerScreen';
import MomentNotificationsScreen from '../screens/moment/MomentNotificationsScreen';
import PostDetailsScreen from '../screens/moment/PostDetailsScreen';
import PostMomentScreen from '../screens/moment/PostMomentScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import SearchScreen from '../screens/SearchScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { colors } from '../theme/tokens';
import TabShell from './TabShell';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Three stacks, picked by auth state rather than by navigating between them —
 * so signing in, finishing registration and signing out can't leave the old
 * screens on the back stack.
 *
 * signedOut    → Welcome / e-mail / phone sign-in
 * needsProfile → signed in, but the backend still wants a profile (registration)
 * ready        → the app proper (Tabs is the shell that owns the bottom bar;
 *                Home is the old placeholder that still holds sign-out)
 */
export default function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.black} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'signedOut' ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="EmailAuth" component={EmailAuthScreen} />
            <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
            {/* Also here, not just in `needsProfile`, so Welcome's SIGN UP can
                open it directly. Saving still needs a token, so Confirm only
                goes through once the account exists — see ProfileSetupScreen. */}
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        ) : status === 'needsProfile' ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabShell} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="PostMoment" component={PostMomentScreen} />
            <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
            <Stack.Screen name="MomentNotifications" component={MomentNotificationsScreen} />
            <Stack.Screen
              name="MediaViewer"
              component={MediaViewerScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen name="Home" component={HomeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
