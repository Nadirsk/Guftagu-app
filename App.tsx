import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { PostStateProvider } from './src/screens/moment/PostStateContext';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // TextInput renders as a real <input> on web, which some browsers/OS themes give a
    // focus border/outline that inline RN styles (borderWidth/outlineWidth: 0) don't
    // fully suppress — !important here overrides that regardless of where it comes from.
    // Scoped by id, not a blanket `input, textarea` selector — that also hit the OTP
    // boxes (OtpInput.tsx), whose only visible edge *is* that border.
    if (Platform.OS !== 'web') return;

    const style = document.createElement('style');
    style.textContent = `
      #email-address-input, #phone-number-input {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // gesture-handler needs a root view as close to the app root as possible;
    // gestures outside one never activate.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Above the navigator, so a like survives leaving the screen it was
              made on and both screens read the same count. */}
          <PostStateProvider>
            <RootNavigator />
          </PostStateProvider>
        </AuthProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
