import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Ban, BellOff, ChevronRight, Flag, LogOut, Pencil, Pin, Trash } from 'lucide-react-native';
import { type ComponentType, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf, type ChatUser, type Conversation, nameOf } from './parts';
import { UserAvatar } from '../../components/UserAvatar';

/**
 * Chat Settings. Follow, Mute and Block are the server's
 * (`/users/{uuid}/follow`, `/conversations/{uuid}/mute`, `/users/{uuid}/block`);
 * Delete leaves the thread. Pin Chat, Alias and Clear Chat History are per-person
 * on the participant row (`/conversations/{uuid}/pin|alias|clear`).
 *
 * The person is the header; the rest is three grouped cards — Chat, Safety and
 * Chat history — with the destructive ones in red and confirmed in a sheet.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatSettings'>;
type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type SwitchKey = 'pin' | 'mute' | 'block';
type Sheet = 'alias' | 'clear' | 'delete' | null;

const INK = '#17171A';
const SUBTLE = '#6B6B73';
const HAIRLINE = '#E7E5E1';
const WASH = '#F4F3F1';
const BLUE = '#005DE9';
const BLUE_WASH = '#EAF2FF';
const BLUE_RING = '#DCE9FF';
const DANGER = '#B3261E';
const TRACK_OFF = '#C9C6C0';
const MAX_ALIAS = 30;

export default function ChatSettingsScreen() {
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { uuid, peer, alias: initialAlias } = useRoute<RouteProp<RootStackParamList, 'ChatSettings'>>().params;
  const { token, user } = useAuth();
  const [state, setState] = useState({ mute: false, block: false, pin: false });
  // null until the server says, so Follow never flashes for someone you already follow.
  const [following, setFollowing] = useState<boolean | null>(null);
  // Seeded from the chat that opened this, so the name is right from the first frame.
  const [alias, setAlias] = useState<string | null>(initialAlias ?? null);
  const [aliasDraft, setAliasDraft] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
        .then((list) => live && setFollowing(list.some((u) => u.uuid === peer.uuid)))
        .catch(() => undefined);
    }
    api<{ user: ChatUser | null }[]>('/blocks?per_page=100', { token })
      .then((list) => live && setState((s) => ({ ...s, block: list.some((b) => b.user?.uuid === peer.uuid) })))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [peer.uuid, token, user, uuid]);

  // Android is edge-to-edge, so the window does not resize for the keyboard: the alias
  // sheet pads its bottom by the keyboard's height to stay above it.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  // Follow is only offered to someone you do not follow yet; once you do, it goes away.
  const follow = async () => {
    setBusy('follow');
    try {
      await api(`/users/${peer.uuid}/follow`, { method: 'POST', token });
      setFollowing(true);
    } catch (e) {
      Alert.alert('Chat Settings', e instanceof ApiError ? e.displayMessage : 'Could not follow right now.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (key: SwitchKey) => {
    if (key === 'mute') {
      run('mute', () => api(`/conversations/${uuid}/mute`, { method: 'POST', body: { muted: !state.mute }, token }), { mute: !state.mute });
    } else if (key === 'pin') {
      run('pin', () => api(`/conversations/${uuid}/pin`, { method: 'POST', body: { pinned: !state.pin }, token }), { pin: !state.pin });
    } else {
      run('block', () => api(`/users/${peer.uuid}/block`, { method: state.block ? 'DELETE' : 'POST', token }), { block: !state.block });
    }
  };

  const openAlias = () => {
    setAliasDraft(alias ?? '');
    setSheet('alias');
  };

  const saveAlias = async () => {
    const next = aliasDraft.trim();
    setSheet(null);
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

  const confirm = async () => {
    const which = sheet;
    setSheet(null);
    if (which === 'clear') {
      run('clear', () => api(`/conversations/${uuid}/clear`, { method: 'POST', token }), {});
    } else if (which === 'delete') {
      try {
        await api(`/conversations/${uuid}/leave`, { method: 'POST', token });
        navigation.dispatch(StackActions.popToTop());
      } catch (e) {
        Alert.alert('Delete', e instanceof ApiError ? e.displayMessage : 'Could not delete the chat.');
      }
    }
  };

  const displayName = alias ?? nameOf(peer);

  type Row = {
    key: string;
    title: string;
    hint: string;
    Icon: IconType;
    danger?: boolean;
  } & ({ kind: 'switch'; on: boolean; onPress: () => void } | { kind: 'nav'; value?: string; onPress: () => void });

  const chatRows: Row[] = [
    { key: 'alias', title: 'Alias', hint: 'A private name only you see', Icon: Pencil, kind: 'nav', value: alias ?? 'Not set', onPress: openAlias },
    { key: 'pin', title: 'Pin chat', hint: 'Keep it at the top of your list', Icon: Pin, kind: 'switch', on: state.pin, onPress: () => toggle('pin') },
    { key: 'mute', title: 'Mute notifications', hint: 'No alerts for new messages', Icon: BellOff, kind: 'switch', on: state.mute, onPress: () => toggle('mute') },
  ];
  const safetyRows: Row[] = [
    { key: 'block', title: 'Block', hint: 'They cannot message or call you', Icon: Ban, kind: 'switch', on: state.block, onPress: () => toggle('block') },
    { key: 'report', title: 'Report', hint: 'Tell us if something is wrong', Icon: Flag, kind: 'nav', onPress: () => navigation.navigate('Report', { userUuid: peer.uuid, peer }) },
  ];
  const historyRows: Row[] = [
    { key: 'clear', title: 'Clear chat history', hint: 'Removes the messages from your side only', Icon: Trash, kind: 'nav', danger: true, onPress: () => setSheet('clear') },
    { key: 'delete', title: 'Delete chat', hint: 'Leaves this conversation', Icon: LogOut, kind: 'nav', danger: true, onPress: () => setSheet('delete') },
  ];

  const renderGroup = (title: string, rows: Row[]) => (
    <>
      <Text style={[styles.groupTitle, { marginTop: px(20), marginBottom: px(8), paddingLeft: px(4), fontSize: px(13) }]}>{title}</Text>
      <View style={[styles.group, { borderRadius: px(18) }]}>
        {rows.map((r, i) => (
          <Pressable
            key={r.key}
            onPress={r.onPress}
            disabled={busy === r.key}
            accessibilityRole={r.kind === 'switch' ? 'switch' : 'button'}
            accessibilityState={r.kind === 'switch' ? { checked: r.on } : undefined}
            style={[
              styles.row,
              {
                paddingVertical: px(12),
                paddingHorizontal: px(14),
                gap: px(12),
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: HAIRLINE,
                opacity: busy === r.key ? 0.5 : 1,
              },
            ]}
          >
            <View style={[styles.rowIcon, { width: px(36), height: px(36), borderRadius: px(18) }]}>
              <r.Icon size={px(18)} color={r.danger ? DANGER : INK} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { fontSize: px(14.5), lineHeight: px(21), color: r.danger ? DANGER : INK }]}>{r.title}</Text>
              <Text style={[styles.rowHint, { fontSize: px(12.5), lineHeight: px(18) }]}>{r.hint}</Text>
            </View>
            {r.kind === 'switch' ? (
              <View
                style={{
                  width: px(46),
                  height: px(28),
                  borderRadius: px(14),
                  backgroundColor: r.on ? BLUE : TRACK_OFF,
                  justifyContent: 'center',
                  paddingHorizontal: px(3),
                  alignItems: r.on ? 'flex-end' : 'flex-start',
                }}
              >
                <View style={{ width: px(22), height: px(22), borderRadius: px(11), backgroundColor: colors.white }} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), maxWidth: px(120) }}>
                {r.value ? (
                  <Text numberOfLines={1} style={[styles.rowHint, { flexShrink: 1, fontSize: px(13.5) }]}>{r.value}</Text>
                ) : null}
                {r.danger ? null : <ChevronRight size={px(18)} color={SUBTLE} />}
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </>
  );

  const confirmCopy =
    sheet === 'delete'
      ? {
          title: `Delete chat with ${displayName}?`,
          body: 'You leave this conversation and it disappears from your list. You can start a new chat with them any time.',
          cta: 'Delete',
        }
      : { title: 'Clear chat history?', body: 'Every message so far is removed from your side. They keep their copy.', cta: 'Clear' };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + px(6), paddingHorizontal: px(8), paddingBottom: px(8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back" style={[styles.back, { width: px(44), height: px(44) }]}>
          <ArrowLeft size={px(24)} color={INK} />
        </Pressable>
        <Text style={[styles.title, { fontSize: px(18) }]}>Chat Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: px(16), paddingTop: px(4), paddingBottom: px(28) + insets.bottom }}
      >
        {/* the person */}
        <View style={{ alignItems: 'center', paddingTop: px(8), paddingBottom: px(4) }}>
          <UserAvatar
            source={avatarOf(peer)}
            frame={peer.frame}
            size={px(92)}
            imageStyle={{
              borderWidth: 3,
              borderColor: colors.white,
              backgroundColor: WASH,
              // A soft ring, drawn as a shadow so the photo keeps its full size.
              shadowColor: BLUE_RING,
              shadowOpacity: 1,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <Text numberOfLines={1} style={[styles.name, { marginTop: px(12), fontSize: px(21), lineHeight: px(28), maxWidth: px(300) }]}>
            {displayName}
          </Text>
          {alias ? <Text style={[styles.rowHint, { marginTop: px(1), fontSize: px(13) }]}>{nameOf(peer)}</Text> : null}
          {peer.guftagu_id ? <Text style={[styles.rowHint, { marginTop: px(2), fontSize: px(12.5) }]}>ID: {peer.guftagu_id}</Text> : null}
          {following === false ? (
            <Pressable
              onPress={follow}
              disabled={busy === 'follow'}
              accessibilityRole="button"
              style={[
                styles.follow,
                { marginTop: px(14), height: px(38), paddingHorizontal: px(24), borderRadius: px(19), opacity: busy === 'follow' ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.followLabel, { fontSize: px(14) }]}>Follow</Text>
            </Pressable>
          ) : null}
        </View>

        {renderGroup('Chat', chatRows)}
        {renderGroup('Safety', safetyRows)}
        {renderGroup('Chat history', historyRows)}
      </ScrollView>

      {/* alias */}
      <Modal visible={sheet === 'alias'} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable onPress={() => setSheet(null)} style={styles.scrim}>
          <Pressable
            style={[
              styles.sheet,
              {
                paddingHorizontal: px(20),
                paddingTop: px(10),
                paddingBottom: keyboardHeight > 0 ? keyboardHeight + px(12) : Math.max(insets.bottom, px(12)) + px(16),
              },
            ]}
          >
            <View style={[styles.grab, { width: px(40), height: px(4), marginBottom: px(16) }]} />
            <Text style={[styles.sheetTitle, { fontSize: px(18) }]}>Set an alias</Text>
            <Text style={[styles.rowHint, { marginTop: px(4), fontSize: px(13.5), lineHeight: px(20) }]}>
              Only you see this name. It does not change their profile.
            </Text>
            <TextInput
              value={aliasDraft}
              onChangeText={setAliasDraft}
              maxLength={MAX_ALIAS}
              autoFocus
              placeholder={nameOf(peer)}
              placeholderTextColor={SUBTLE}
              accessibilityLabel="Alias"
              style={[styles.aliasInput, { marginTop: px(16), height: px(50), borderRadius: px(14), paddingHorizontal: px(16), fontSize: px(15) }]}
            />
            <Text style={[styles.rowHint, { marginTop: px(6), textAlign: 'right', fontSize: px(12) }]}>
              {aliasDraft.length}/{MAX_ALIAS}
            </Text>
            <View style={{ marginTop: px(14), flexDirection: 'row', gap: px(10) }}>
              <Pressable onPress={() => setSheet(null)} style={[styles.sheetButton, { height: px(50), borderRadius: px(25), backgroundColor: WASH }]}>
                <Text style={[styles.sheetButtonLabel, { fontSize: px(15), color: INK }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveAlias} style={[styles.sheetButton, { height: px(50), borderRadius: px(25), backgroundColor: BLUE }]}>
                <Text style={[styles.sheetButtonLabel, { fontSize: px(15), color: colors.white }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* clear / delete */}
      <Modal visible={sheet === 'clear' || sheet === 'delete'} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable onPress={() => setSheet(null)} style={styles.scrim}>
          <Pressable style={[styles.sheet, { paddingHorizontal: px(20), paddingTop: px(10), paddingBottom: Math.max(insets.bottom, px(12)) + px(16) }]}>
            <View style={[styles.grab, { width: px(40), height: px(4), marginBottom: px(16) }]} />
            <Text style={[styles.sheetTitle, { fontSize: px(18) }]}>{confirmCopy.title}</Text>
            <Text style={[styles.rowHint, { marginTop: px(6), fontSize: px(13.5), lineHeight: px(21) }]}>{confirmCopy.body}</Text>
            <View style={{ marginTop: px(20), flexDirection: 'row', gap: px(10) }}>
              <Pressable onPress={() => setSheet(null)} style={[styles.sheetButton, { height: px(50), borderRadius: px(25), backgroundColor: WASH }]}>
                <Text style={[styles.sheetButtonLabel, { fontSize: px(15), color: INK }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirm} style={[styles.sheetButton, { height: px(50), borderRadius: px(25), backgroundColor: DANGER }]}>
                <Text style={[styles.sheetButtonLabel, { fontSize: px(15), color: colors.white }]}>{confirmCopy.cta}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white },
  back: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.fontFamily.semiBold, color: INK, marginLeft: 4 },

  name: { fontFamily: typography.fontFamily.semiBold, color: INK },

  follow: { alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE },
  followLabel: { fontFamily: typography.fontFamily.semiBold, color: colors.white },

  groupTitle: { fontFamily: typography.fontFamily.semiBold, color: SUBTLE },
  group: { backgroundColor: WASH, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  rowTitle: { fontFamily: typography.fontFamily.medium },
  rowHint: { fontFamily: typography.fontFamily.regular, color: SUBTLE },

  scrim: { flex: 1, backgroundColor: 'rgba(20,20,23,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grab: { alignSelf: 'center', borderRadius: 2, backgroundColor: '#D9D6D0' },
  sheetTitle: { fontFamily: typography.fontFamily.semiBold, color: INK },
  aliasInput: {
    fontFamily: typography.fontFamily.regular,
    color: INK,
    borderWidth: 1.5,
    borderColor: BLUE,
    backgroundColor: BLUE_WASH,
  },
  sheetButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheetButtonLabel: { fontFamily: typography.fontFamily.semiBold },
});
