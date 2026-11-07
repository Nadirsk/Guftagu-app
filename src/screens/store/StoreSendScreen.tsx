import { type RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { avatarOf, type ChatUser, nameOf, usePeople } from '../chats/parts';
import { SELECT, SELECT_SCALE } from './geometry';
import { ConfirmDialog, InsufficientCoinsDialog, isInsufficientCoins, STORE_EXTRA_TABS, STORE_TABS, styles as s, TopBar } from './parts';
import { UserAvatar } from '../../components/UserAvatar';

/**
 * Store → Send → Select (Figma 4001:8124 Friends, 4001:8135 Follow, 4001:8146 confirm).
 * Friends is `/friends`; Follow is the people you follow. Send on a row asks first,
 * then `POST /store/items/{id}/send` buys the item for them.
 *
 * These frames are 440 wide, so every number goes through `u` = px × 402/440.
 */

type Tab = 'friends' | 'follow';
const TABS: { key: Tab; label: string; center: number }[] = [
  { key: 'friends', label: 'Friends', center: SELECT.tabs.friendsCenter },
  { key: 'follow', label: 'Follow', center: SELECT.tabs.followCenter },
];

export default function StoreSendScreen() {
  const { px } = useDesignScale();
  const u = (v: number) => px(v * SELECT_SCALE);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { item } = useRoute<RouteProp<RootStackParamList, 'StoreSend'>>().params;
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');
  const [target, setTarget] = useState<ChatUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [noCoins, setNoCoins] = useState(false);
  const { people, loaded } = usePeople(
    tab === 'friends' ? '/friends?per_page=100' : user ? `/users/${user.uuid}/following?per_page=100` : null,
  );

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const send = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api(`/store/items/${item.id}/send`, { method: 'POST', body: { user_uuid: target.uuid }, token });
      setTarget(null);
      const category = [...STORE_TABS, ...STORE_EXTRA_TABS].find((c) => c.type === item.type)?.label;
      Alert.alert('Sent', `${item.name} is in ${nameOf(target)}'s Item Bag${category ? ` under ${category}` : ''}.`);
      navigation.goBack();
    } catch (e) {
      if (isInsufficientCoins(e)) {
        setTarget(null);
        setNoCoins(true);
        return;
      }
      Alert.alert('Send', e instanceof ApiError ? e.displayMessage : 'Could not send the item.');
    } finally {
      setBusy(false);
    }
  };

  const T = SELECT.tabs;
  const L = SELECT.list;
  const R = SELECT.row;
  const B = SELECT.send;

  return (
    <View style={styles.screen}>
      <TopBar
        back={SELECT.back}
        title={{ text: 'Select', ...SELECT.title }}
        color={colors.white}
        onBack={() => navigation.goBack()}
        u={u}
      />

      {/* Each label is centred on its Figma centre; Line 81 starts under the open one. */}
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            hitSlop={u(8)}
            style={{ position: 'absolute', top: u(T.y), left: u(t.center - 60), width: u(120), alignItems: 'center' }}
          >
            <View>
              <Text style={[s.regular, { color: on ? colors.white : T.inactive, fontSize: u(T.size), lineHeight: u(T.line) }]}>{t.label}</Text>
              {on ? (
                <View style={{ position: 'absolute', left: u(2), top: u(T.underlineY - T.underline), width: u(T.underlineWidth), height: u(T.underline), backgroundColor: colors.white }} />
              ) : null}
            </View>
          </Pressable>
        );
      })}

      <FlatList
        data={people}
        keyExtractor={(p) => p.uuid}
        style={{ position: 'absolute', left: 0, right: 0, top: u(L.y), bottom: 0 }}
        contentContainerStyle={{ paddingLeft: u(L.x), paddingRight: u(L.right), paddingBottom: u(40), gap: u(L.rowGap) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: p }) => (
          <View style={[s.row, { height: u(R.height) }]}>
            <UserAvatar source={avatarOf(p)} frame={p.frame} size={u(R.avatar)} />
            <Text numberOfLines={1} style={[s.medium, s.white, { flex: 1, marginLeft: u(R.nameGap), marginRight: u(10), fontSize: u(R.name), lineHeight: u(R.nameLine) }]}>
              {nameOf(p)}
            </Text>
            <Pressable
              onPress={() => setTarget(p)}
              style={[s.center, { width: u(B.width), height: u(B.height), borderRadius: u(B.radius), backgroundColor: B.background }]}
            >
              <Text style={[s.regular, { color: B.color, fontSize: u(B.size), lineHeight: u(B.line) }]}>Send</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          loaded ? (
            <Text style={[s.regular, styles.empty, { marginTop: u(80), fontSize: u(16) }]}>
              {tab === 'friends' ? 'No friends yet' : 'You are not following anyone yet'}
            </Text>
          ) : (
            <ActivityIndicator style={{ marginTop: u(80) }} color={colors.white} />
          )
        }
      />

      {target ? (
        <ConfirmDialog
          variant="send"
          item={item}
          question={`Are you sure to send it to ${nameOf(target)}?`}
          avatar={avatarOf(target)}
          busy={busy}
          onCancel={() => setTarget(null)}
          onConfirm={send}
          u={u}
        />
      ) : null}

      {noCoins ? (
        <InsufficientCoinsDialog
          u={u}
          onClose={() => setNoCoins(false)}
          onRecharge={() => {
            setNoCoins(false);
            navigation.navigate('Wallet', { tab: 'coin' });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});
