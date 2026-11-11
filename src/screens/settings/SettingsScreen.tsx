import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';

import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { SETTINGS } from './geometry';
import { Chevron, Rule, SettingsHeader, styles as s, useSettingsUnit } from './parts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** How far above a row's text its touch area starts — half the gap to the rule above. */
const TOUCH_ABOVE = 25;
const TOUCH_HEIGHT = 74;

/**
 * Profile → Settings (Figma 601:4125). Every row opens its own screen; Logout asks
 * first, then signs out of this device.
 */
export default function SettingsScreen() {
  const u = useSettingsUnit();
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, []),
  );

  const logout = () =>
    Alert.alert('Logout', 'Do you want to log out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => signOut() },
    ]);

  const rows: [string, () => void][] = [
    ['Account', () => navigation.navigate('Account')],
    ['Language', () => navigation.navigate('LanguageSettings')],
    ['Block List', () => navigation.navigate('BlockList')],
    ['Notification', () => navigation.navigate('NotificationSettings')],
    ['Feedback', () => navigation.navigate('Feedback')],
    ['About Us', () => navigation.navigate('LegalPage', { type: 'about', title: 'About Us' })],
    ['Privacy Policy', () => navigation.navigate('LegalPage', { type: 'privacy', title: 'Privacy Policy' })],
    ['Terms of use', () => navigation.navigate('LegalPage', { type: 'terms', title: 'Terms of use' })],
    ['Logout', logout],
  ];

  const L = SETTINGS.label;
  return (
    <View style={s.screen}>
      <SettingsHeader title="Settings" />
      {SETTINGS.rules.map((y) => (
        <Rule key={y} x={SETTINGS.rule.x} y={y} width={SETTINGS.rule.width} />
      ))}
      {rows.map(([label, onPress], n) => {
        const y = SETTINGS.rows[n];
        return (
          <Pressable
            key={label}
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
              position: 'absolute',
              left: 0,
              right: 0,
              top: u(y - TOUCH_ABOVE),
              height: u(TOUCH_HEIGHT),
              backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : 'transparent',
            })}
          >
            <Text style={[s.medium, { position: 'absolute', left: u(L.x), top: u(TOUCH_ABOVE + L.dy), fontSize: u(L.size), lineHeight: u(L.line) }]}>{label}</Text>
            <View style={{ position: 'absolute', left: u(SETTINGS.chevron.x), top: u(TOUCH_ABOVE) }}>
              <Chevron size={SETTINGS.chevron.size} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
