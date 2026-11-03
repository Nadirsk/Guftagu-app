import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { SETTINGS } from './geometry';
import { avatarOf, type ChatUser, type Conversation, ListHeader, nameOf, styles, Toggle } from './parts';

/**
 * Chat Settings — node 514:2763. Follow, Mute and Block are the server's
 * (`/users/{uuid}/follow`, `/conversations/{uuid}/mute`, `/users/{uuid}/block`);
 * Delete leaves the thread. Pin Chat, Alias and Clear Chat History are per-person
 * on the participant row (`/conversations/{uuid}/pin|alias|clear`).
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatSettings'>;
type Row = { key: string; label: string; y: number; toggle?: boolean };

/** Frame 1597881523's rows, y relative to the list. */
const ROWS: Row[] = [
  { key: 'alias', label: 'Alias', y: 0 },
  { key: 'follow', label: 'Follow', y: 55, toggle: true },
  { key: 'pin', label: 'Pin Chat', y: 118, toggle: true },
  { key: 'mute', label: 'Mute Notification', y: 181, toggle: true },
  { key: 'clear', label: 'Clear Chat History', y: 244 },
  { key: 'report', label: 'Report', y: 299 },
  { key: 'block', label: 'Block', y: 354, toggle: true },
];

export default function ChatSettingsScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { uuid, peer } = useRoute<RouteProp<RootStackParamList, 'ChatSettings'>>().params;
  const { token, user } = useAuth();
  const [state, setState] = useState({ follow: false, mute: false, block: false, pin: false });
  const [alias, setAlias] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const S = SETTINGS;

  // Each switch starts from what the server says.
  useEffect(() => {
    let live = true;
    api<{ conversation: Conversation }>(`/conversations/${uuid}`, { token })
      .then(({ conversation }) => {
        if (!live) return;
        setState((s) => ({ ...s, mute: conversation.is_muted, pin: conversation.is_pinned }));
        setAlias(conversation.alias);
      })
      .catch(() => undefined);
    if (user) {
      api<ChatUser[]>(`/users/${user.uuid}/following?per_page=100`, { token })
        .then((list) => live && setState((s) => ({ ...s, follow: list.some((u) => u.uuid === peer.uuid) })))
        .catch(() => undefined);
    }
    api<{ user: ChatUser | null }[]>('/blocks?per_page=100', { token })
      .then((list) => live && setState((s) => ({ ...s, block: list.some((b) => b.user?.uuid === peer.uuid) })))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [peer.uuid, token, user, uuid]);

  const run = async (key: string, call: () => Promise<unknown>, next: Partial<typeof state>) => {
    setBusy(key);
    try {
      await call();
      setState((s) => ({ ...s, ...next }));
    } catch (e) {
      Alert.alert('Chat Settings', e instanceof ApiError ? e.displayMessage : 'Could not change that right now.');
    } finally {
      setBusy(null);
    }
  };

  const press = (key: string) => {
    if (key === 'follow') {
      run('follow', () => api(`/users/${peer.uuid}/follow`, { method: state.follow ? 'DELETE' : 'POST', token }), { follow: !state.follow });
    } else if (key === 'mute') {
      run('mute', () => api(`/conversations/${uuid}/mute`, { method: 'POST', body: { muted: !state.mute }, token }), { mute: !state.mute });
    } else if (key === 'pin') {
      run('pin', () => api(`/conversations/${uuid}/pin`, { method: 'POST', body: { pinned: !state.pin }, token }), { pin: !state.pin });
    } else if (key === 'alias') {
      setEditing(alias ?? '');
    } else if (key === 'clear') {
      Alert.alert('Clear Chat History', 'Every message so far will be removed from your side. They keep theirs.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => run('clear', () => api(`/conversations/${uuid}/clear`, { method: 'POST', token }), {}) },
      ]);
    } else if (key === 'block') {
      run('block', () => api(`/users/${peer.uuid}/block`, { method: state.block ? 'DELETE' : 'POST', token }), { block: !state.block });
    } else if (key === 'report') {
      navigation.navigate('Report', { userUuid: peer.uuid });
    }
  };

  const saveAlias = async () => {
    const next = (editing ?? '').trim();
    setEditing(null);
    setBusy('alias');
    try {
      await api(`/conversations/${uuid}/alias`, { method: 'POST', body: { alias: next }, token });
      setAlias(next === '' ? null : next);
    } catch (e) {
      Alert.alert('Alias', e instanceof ApiError ? e.displayMessage : 'Could not save the alias.');
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    Alert.alert('Delete', `Delete your chat with ${nameOf(peer)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/conversations/${uuid}/leave`, { method: 'POST', token });
            navigation.dispatch(StackActions.popToTop());
          } catch (e) {
            Alert.alert('Delete', e instanceof ApiError ? e.displayMessage : 'Could not delete the chat.');
          }
        },
      },
    ]);

  const on = (key: string) => (key === 'follow' ? state.follow : key === 'mute' ? state.mute : key === 'block' ? state.block : key === 'pin' ? state.pin : false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ListHeader title="Chat Settings" onBack={() => navigation.goBack()} box={S.header} />

      <View style={{ position: 'absolute', left: px(S.peer.x), top: px(S.peer.y), width: px(S.peer.width), height: px(S.peer.avatar), flexDirection: 'row', alignItems: 'center' }}>
        <Image source={avatarOf(peer)} style={{ width: px(S.peer.avatar), height: px(S.peer.avatar), borderRadius: px(S.peer.avatar / 2) }} />
        <Text numberOfLines={1} style={[styles.regular, { flex: 1, marginLeft: px(S.peer.gap), fontSize: px(S.peer.size), lineHeight: px(25) }]}>
          {alias ?? nameOf(peer)}
        </Text>
        <ChevronRight size={px(S.chevron)} color={colors.black} strokeWidth={2.5} />
      </View>

      {ROWS.map((r) => (
        <Pressable
          key={r.key}
          onPress={r.toggle ? undefined : () => press(r.key)}
          style={{
            position: 'absolute',
            left: px(S.list.x),
            top: px(S.list.y + r.y),
            width: px(S.list.width),
            height: px(r.toggle ? S.toggle.height : 25),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={[styles.regular, { fontSize: px(S.list.size), lineHeight: px(25) }]}>{r.label}</Text>
          {r.key === 'alias' && alias ? (
            <Text numberOfLines={1} style={[styles.regular, { flex: 1, textAlign: 'right', marginRight: px(6), fontSize: px(16), color: '#8A8A8A' }]}>
              {alias}
            </Text>
          ) : null}
          {r.toggle ? (
            <Toggle on={on(r.key)} disabled={busy === r.key} onPress={() => press(r.key)} />
          ) : (
            <ChevronRight size={px(S.chevron)} color={colors.black} strokeWidth={2.5} />
          )}
        </Pressable>
      ))}

      <Pressable onPress={remove} hitSlop={px(10)} style={{ position: 'absolute', left: 0, right: 0, bottom: px(S.delete.bottom), alignItems: 'center' }}>
        <Text style={[styles.regular, { fontSize: px(S.delete.size), lineHeight: px(25), color: S.delete.color }]}>Delete</Text>
      </Pressable>

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable onPress={() => setEditing(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: px(32) }}>
          <Pressable style={{ backgroundColor: colors.white, borderRadius: px(16), padding: px(20) }}>
            <Text style={[styles.medium, { fontSize: px(18), marginBottom: px(12) }]}>Alias for {nameOf(peer)}</Text>
            <TextInput
              value={editing ?? ''}
              onChangeText={setEditing}
              placeholder="Nickname (only you see it)"
              maxLength={50}
              autoFocus
              style={[styles.regular, { fontSize: px(16), borderBottomWidth: 1, borderColor: '#D0D0D0', paddingVertical: px(8) }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: px(20), gap: px(24) }}>
              <Pressable onPress={() => setEditing(null)} hitSlop={px(8)}>
                <Text style={[styles.regular, { fontSize: px(16) }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveAlias} hitSlop={px(8)}>
                <Text style={[styles.medium, { fontSize: px(16), color: '#005DE9' }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
