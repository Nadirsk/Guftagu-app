import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import EmailAuthScreen from '../screens/EmailAuthScreen';
import HomeScreen from '../screens/HomeScreen';
import LevelScreen from '../screens/level/LevelScreen';
import MediaViewerScreen from '../screens/moment/MediaViewerScreen';
import MomentNotificationsScreen from '../screens/moment/MomentNotificationsScreen';
import PostDetailsScreen from '../screens/moment/PostDetailsScreen';
import ChatSettingsScreen from '../screens/chats/ChatSettingsScreen';
import ConversationScreen from '../screens/chats/ConversationScreen';
import ReportScreen from '../screens/chats/ReportScreen';
import PostMomentScreen from '../screens/moment/PostMomentScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import ProfileListScreen from '../screens/profile/ProfileListScreen';
import RankingRewardScreen from '../screens/ranking/RankingRewardScreen';
import RankingScreen from '../screens/ranking/RankingScreen';
import CreateRoomScreen from '../screens/room/CreateRoomScreen';
import RoomScreen from '../screens/room/RoomScreen';
import { MiniRoomPill, navigationRef, RoomSessionProvider } from '../screens/room/RoomSession';
import SearchScreen from '../screens/SearchScreen';
import ItemBagScreen from '../screens/itemBag/ItemBagScreen';
import AccountScreen from '../screens/settings/AccountScreen';
import BlockListScreen from '../screens/settings/BlockListScreen';
import FeedbackScreen from '../screens/settings/FeedbackScreen';
import LanguageScreen from '../screens/settings/LanguageScreen';
import LegalPageScreen from '../screens/settings/LegalPageScreen';
import NotificationScreen from '../screens/settings/NotificationScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import MedalsScreen from '../screens/medals/MedalsScreen';
import MedalRuleScreen from '../screens/medals/MedalRuleScreen';
import CpRankingScreen from '../screens/cp/CpRankingScreen';
import BlindDateCreateScreen from '../screens/blindDate/BlindDateCreateScreen';
import BlindDateRoomScreen from '../screens/blindDate/BlindDateRoomScreen';
import InviteRewardScreen from '../screens/invite/InviteRewardScreen';
import VipPrivilegesScreen from '../screens/vip/VipPrivilegesScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import CoinsHistoryScreen from '../screens/wallet/CoinsHistoryScreen';
import ExchangeScreen from '../screens/wallet/ExchangeScreen';
import StoreScreen from '../screens/store/StoreScreen';
import StoreSendScreen from '../screens/store/StoreSendScreen';
import WeeklyStarScreen from '../screens/weeklyStar/WeeklyStarScreen';
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
    <RoomSessionProvider>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* navigationKey: ProfileSetup is in both of the first two groups, so without
            it a needsProfile → signedOut switch (back button = sign out) keeps the
            same ProfileSetup instance mounted, now with no user — email/phone unlock
            and keep the signed-in account's values. A changed key drops the old
            group's routes, so sign-out lands on Welcome instead. */}
        {status === 'signedOut' ? (
          <Stack.Group navigationKey="signedOut">
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="EmailAuth" component={EmailAuthScreen} />
            <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
            {/* Also here, not just in `needsProfile`, so Welcome's SIGN UP can
                open it directly. Saving still needs a token, so Confirm only
                goes through once the account exists — see ProfileSetupScreen. */}
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </Stack.Group>
        ) : status === 'needsProfile' ? (
          <Stack.Group navigationKey="needsProfile">
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </Stack.Group>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabShell} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="PostMoment" component={PostMomentScreen} />
            <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
            <Stack.Screen name="MomentNotifications" component={MomentNotificationsScreen} />
            <Stack.Screen name="Room" component={RoomScreen} />
            <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="ChatSettings" component={ChatSettingsScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="WeeklyStar" component={WeeklyStarScreen} />
            <Stack.Screen name="Ranking" component={RankingScreen} />
            <Stack.Screen name="ProfileList" component={ProfileListScreen} />
            <Stack.Screen name="Level" component={LevelScreen} />
            <Stack.Screen name="Store" component={StoreScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="CoinsHistory" component={CoinsHistoryScreen} />
            <Stack.Screen name="Exchange" component={ExchangeScreen} />
            <Stack.Screen name="Medals" component={MedalsScreen} />
            <Stack.Screen name="CpRanking" component={CpRankingScreen} />
            <Stack.Screen name="VipPrivileges" component={VipPrivilegesScreen} />
            <Stack.Screen name="InviteReward" component={InviteRewardScreen} />
            <Stack.Screen name="BlindDateCreate" component={BlindDateCreateScreen} />
            <Stack.Screen name="BlindDateRoom" component={BlindDateRoomScreen} />
            <Stack.Screen name="MedalRule" component={MedalRuleScreen} />
            <Stack.Screen name="StoreSend" component={StoreSendScreen} />
            <Stack.Screen name="ItemBag" component={ItemBagScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Account" component={AccountScreen} />
            <Stack.Screen name="LanguageSettings" component={LanguageScreen} />
            <Stack.Screen name="BlockList" component={BlockListScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="LegalPage" component={LegalPageScreen} />
            {/* Rounded top corners in Figma: it slides up over the Weekly page. */}
            <Stack.Screen
              name="RankingReward"
              component={RankingRewardScreen}
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="MediaViewer"
              component={MediaViewerScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen name="Home" component={HomeScreen} />
          </>
        )}
      </Stack.Navigator>
      {/* Inside the container, over every screen: the room you minimised. */}
      <MiniRoomPill />
    </NavigationContainer>
    </RoomSessionProvider>
  );
}
