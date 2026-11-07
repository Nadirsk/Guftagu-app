import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { UserAvatar } from '../../components/UserAvatar';
import { avatarOf, type ChatUser } from '../chats/parts';
import { BLOCKED, EMPTY, LANGUAGE } from './geometry';
import { SettingsHeader, styles as s, useSettingsUnit } from './parts';

const emptyArt = require('../../assets/settings/empty.png');

/** `GET /blocks` — `BlockController::index()`. */
type BlockRow = { user: ChatUser | null; reason: string | null; blocked_at: string | null };

/**
 * Settings → Block List: Figma 602:4732 when nobody is blocked, 602:4752 otherwise.
 * Unblock takes the person off at once; they can find and follow you again.
 */
export default function BlockListScreen() {
  const u = useSettingsUnit();
  const { token } = useAuth();
  const [rows, setRows] = useState<BlockRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      api<BlockRow[]>('/blocks?per_page=100', { token })
        .then((res) => live && setRows(Array.isArray(res) ? res.filter((r) => r.user) : []))
        .catch(() => live && setRows([]));
      return () => {
        live = false;
      };
    }, [token]),
  );

  const unblock = async (who: ChatUser) => {
    setBusy(who.uuid);
    try {
      await api(`/users/${who.uuid}/block`, { method: 'DELETE', token });
      setRows((prev) => (prev ?? []).filter((r) => r.user?.uuid !== who.uuid));
    } catch (e) {
      Alert.alert('Unblock', e instanceof ApiError ? e.displayMessage : 'Could not unblock them.');
    } finally {
      setBusy(null);
    }
  };

  const B = BLOCKED;
  const E = EMPTY;
  return (
    <View style={s.screen}>
      <SettingsHeader title="Blocked List" />

      {rows === null ? (
        <ActivityIndicator style={{ position: 'absolute', left: 0, right: 0, top: u(B.y + 40) }} color="#999" />
      ) : rows.length === 0 ? (
        // Frame 8978 — image 205633, "No Content here" over its last 25px.
        <View style={{ position: 'absolute', left: u(E.centerX - E.size / 2), top: u(E.y), width: u(E.size), alignItems: 'center' }}>
          <Image source={emptyArt} resizeMode="cover" style={{ width: u(E.size), height: u(E.size), marginBottom: -u(E.overlap) }} />
          <Text style={[s.regular, { width: '100%', textAlign: 'center', fontSize: u(E.text.size), lineHeight: u(E.text.line), opacity: E.text.opacity }]}>No Content here</Text>
        </View>
      ) : (
        <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: u(B.y), bottom: 0 }} contentContainerStyle={{ paddingBottom: u(40) }}>
          {rows.map(({ user: who }) =>
            who ? (
              <View key={who.uuid} style={{ marginLeft: u(B.x), width: u(B.width), height: u(B.step), flexDirection: 'row' }}>
                <UserAvatar source={avatarOf(who)} frame={who.frame} size={u(B.avatar)} />
                <View style={{ position: 'absolute', left: u(B.text.x), top: u(B.text.nameY), width: u(B.button.x - B.text.x - 8) }}>
                  <Text numberOfLines={1} style={[s.medium, { fontSize: u(B.text.name), lineHeight: u(B.text.nameLine) }]}>
                    {who.display_name ?? 'Guftagu user'}
                  </Text>
                  <Text numberOfLines={1} style={[s.regular, { marginTop: u(B.text.idY - B.text.nameLine), fontSize: u(B.text.id), lineHeight: u(B.text.idLine), opacity: 0.4 }]}>
                    {`ID: ${who.guftagu_id ?? ''}`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => unblock(who)}
                  disabled={busy === who.uuid}
                  style={[
                    s.center,
                    {
                      position: 'absolute',
                      left: u(B.button.x),
                      top: u(B.button.y),
                      width: u(B.button.width),
                      height: u(B.button.height),
                      borderRadius: u(LANGUAGE.radius),
                      borderWidth: 1,
                      borderColor: LANGUAGE.on.border,
                      backgroundColor: LANGUAGE.on.background,
                    },
                  ]}
                >
                  {busy === who.uuid ? (
                    <ActivityIndicator color={LANGUAGE.on.text} />
                  ) : (
                    <Text style={[s.medium, { color: LANGUAGE.on.text, fontSize: u(B.button.size), lineHeight: u(B.button.line) }]}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            ) : null,
          )}
        </ScrollView>
      )}
    </View>
  );
}
