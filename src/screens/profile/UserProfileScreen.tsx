import { MomentCounts } from '../../components/MomentCounts';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as profileIcons from '../../assets/profile/icons';
import * as icons from '../../assets/userProfile/icons';
import { useAuth } from '../../auth/AuthContext';
import { UserAvatar, type AvatarFrame } from '../../components/UserAvatar';
import { peek, refresh as swr } from '../../lib/swrCache';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { openThread, type ChatUser } from '../chats/parts';
import { LevelBadges } from '../level/LevelBadge';
import { formatStamp, type FeedItem } from '../moment/parts';
import { useUi } from '../wallet/walletParts';

/**
 * Somebody's public Profile (Figma section 754:13312: 732:16069 About Me, 737:10800 Wall of honor
 * empty, 740:10792 Wall › Gift, 738:10847 Moment). The person comes from `GET /users/{uuid}`, the counts
 * from `/stats`, the Gift wall from `/gifts` and the Moments from `/posts`. Visitors is private, so
 * for anyone but yourself it shows a dash. Medals, Frame and Car have no server data yet and say so.
 * There is no CP or Agency data either: the CP card shows the empty "?" slot and Agency is left out.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Person = {
  uuid: string;
  guftagu_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  gender: string | null;
  wealth_level: number;
  charm_level: number;
  frame: AvatarFrame | null;
  is_self: boolean;
  is_following: boolean;
};
type Stats = { following: number; followers: number; visitors: number | null };
type Gifts = { items: { gift: { id: number; name_en: string | null; thumbnail_url: string | null }; quantity: number }[] };
type Tab = 'about' | 'wall' | 'moment';
type Pill = 'Medals' | 'Gift' | 'Frame' | 'Car';

const PILLS: Pill[] = ['Medals', 'Gift', 'Frame', 'Car'];
const avatarPlaceholder = require('../../assets/avatar-placeholder.png');

export default function UserProfileScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { uuid } = useRoute<RouteProp<RootStackParamList, 'UserProfile'>>().params;
  const { token } = useAuth();
  const personPath = `/users/${uuid}`;
  const statsPath = `/users/${uuid}/stats`;
  const postsPath = `/users/${uuid}/posts?limit=20`;
  const giftsPath = `/users/${uuid}/gifts?direction=received`;

  const [person, setPerson] = useState<Person | null>(() => peek<Person>(personPath, token));
  const [stats, setStats] = useState<Stats | null>(() => peek<Stats>(statsPath, token));
  const [posts, setPosts] = useState<FeedItem[] | null>(null);
  const [gifts, setGifts] = useState<Gifts | null>(null);
  const [tab, setTab] = useState<Tab>('about');
  const [pill, setPill] = useState<Pill>('Medals');
  const [opening, setOpening] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, []),
  );

  useEffect(() => {
    const stops = [swr<Person>(personPath, token, setPerson), swr<Stats>(statsPath, token, setStats)];
    // Opening somebody's profile counts as a visit (it feeds their Visitors list).
    api(`/users/${uuid}/visit`, { method: 'POST', token }).catch(() => undefined);
    return () => stops.forEach((s) => s());
  }, [token, uuid, personPath, statsPath]);

  useEffect(() => {
    if (tab === 'moment') return swr<FeedItem[]>(postsPath, token, setPosts, undefined, () => setPosts((p) => p ?? []));
    if (tab === 'wall' && pill === 'Gift') return swr<Gifts>(giftsPath, token, setGifts, undefined, () => setGifts((g) => g ?? { items: [] }));
    return undefined;
  }, [tab, pill, token, postsPath, giftsPath]);

  const name = person?.display_name ?? 'Guftagu user';
  const photo = person?.avatar_url ? { uri: person.avatar_url } : avatarPlaceholder;
  const chat = async (openGift = false) => {
    if (!person || opening) return;
    setOpening(true);
    try {
      const peer = { uuid: person.uuid, display_name: person.display_name, avatar_url: person.avatar_url, guftagu_id: person.guftagu_id } as unknown as ChatUser;
      const c = await openThread(token, peer);
      navigation.navigate('Conversation', { uuid: c.uuid, peer, alias: c.alias, openGift });
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not open the chat.');
    } finally {
      setOpening(false);
    }
  };

  const [followBusy, setFollowBusy] = useState(false);
  const toggleFollow = async () => {
    if (!person || followBusy) return;
    setFollowBusy(true);
    const was = person.is_following;
    setPerson({ ...person, is_following: !was });
    try {
      await api(`/users/${uuid}/follow`, { method: was ? 'DELETE' : 'POST', token });
      swr<Stats>(statsPath, token, setStats);
    } catch (e) {
      setPerson((p) => (p ? { ...p, is_following: was } : p));
      Alert.alert('Follow', e instanceof ApiError ? e.displayMessage : 'Could not update that right now.');
    } finally {
      setFollowBusy(false);
    }
  };

  // Where the tab body ends, so the Chat / Send Gift pair sits under it (Figma's Wall frames put it at y 800).
  let bottom = 760;
  if (tab === 'wall') {
    bottom = pill === 'Gift' && (gifts?.items.length ?? 0) > 0 ? 611 + Math.ceil(gifts!.items.length / 4) * 101 : 760;
  }
  if (tab === 'moment') bottom = 499 + Math.max(1, posts?.length ?? 0) * 229;
  const footerTop = Math.max(800, bottom + 24);
  const contentHeight = footerTop + 56 + 47 + 40;

  const tabLabel = (key: Tab, label: string, centerX: number) => (
    <Pressable key={key} onPress={() => setTab(key)} hitSlop={px(8)} style={[at(centerX - 70, 424), { width: px(140), alignItems: 'center' }]}>
      <Text style={[text(16, 'medium'), { opacity: tab === key ? 1 : 0.4 }]}>{label}</Text>
    </Pressable>
  );

  const empty = (
    <>
      <Image source={require('../../assets/userProfile/no-content.png')} resizeMode="stretch" style={[at(93, 555), { width: px(216), height: px(169) }]} />
      <Text style={[at(76, 733), { width: px(242), textAlign: 'center', opacity: 0.4 }, text(18, 'medium')]}>No content here</Text>
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ height: px(contentHeight) }}>
        {/* The photo in its frame, then name + gender, ID, country. */}
        <UserAvatar source={photo} frame={person?.frame} size={px(87)} style={at(41, 114)} />
        <View style={[at(172, 114), { flexDirection: 'row', alignItems: 'center', gap: px(8) }]}>
          <Text numberOfLines={1} style={[{ maxWidth: px(160) }, text(20, 'medium')]}>
            {name}
          </Text>
          {person?.gender ? <SvgXml xml={person.gender === 'female' ? profileIcons.female : profileIcons.male} width={px(22.5)} height={px(22.5)} /> : null}
        </View>
        <Text style={[at(172, 144), { opacity: 0.3 }, text(15, 'regular')]}>ID : {person?.guftagu_id ?? ''}</Text>
        {person?.country ? (
          <View style={[at(172, 170), { flexDirection: 'row', alignItems: 'center', gap: px(3) }]}>
            <SvgXml xml={icons.mapPin} width={px(17)} height={px(17)} />
            <Text style={text(15, 'regular')}>{person.country}</Text>
          </View>
        ) : null}
        <View style={at(15, 236)}>{person ? <LevelBadges user={person} height={20} /> : null}</View>

        {/* Frame 1597881266 — Following / Followers / Visitors. */}
        <View
          style={[
            at(5, 275),
            {
              width: px(392),
              height: px(94),
              borderRadius: px(9),
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.09)',
              backgroundColor: colors.white,
              shadowColor: '#000',
              shadowOpacity: 0.07,
              shadowOffset: { width: 0, height: px(4) },
              shadowRadius: px(13),
              elevation: 3,
            },
          ]}
        >
          {([
            [67, stats?.following, 'Following'],
            [196, stats?.followers, 'Followers'],
            [330, stats?.visitors, 'Visitors'],
          ] as const).map(([cx, value, label]) => (
            <View key={label} style={[at(cx - 50, 21), { width: px(100), alignItems: 'center' }]}>
              <Text style={text(20, 'medium')}>{value == null ? (stats ? '-' : '') : value}</Text>
              <Text style={[text(15, 'medium'), { marginTop: px(4), opacity: 0.4 }]}>{label}</Text>
            </View>
          ))}
        </View>

        {tabLabel('about', 'About Me', 45)}
        {tabLabel('wall', 'Wall of honor', 201.5)}
        {tabLabel('moment', 'Moment', 345.75)}

        {tab === 'about' && (
          <>
            <Pressable onPress={() => navigation.navigate('Store')} style={[at(298, 491), { width: px(85), height: px(33), borderRadius: px(23), borderWidth: 1, borderColor: '#EB11AA', backgroundColor: 'rgba(235,17,170,0.17)', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={text(13, 'medium', '#EB11AA')}>Store</Text>
            </Pressable>
            {/* image 205771 — the CP frame, cropped to 384 x 229. */}
            <View style={[at(9, 508), { width: px(384), height: px(229), overflow: 'hidden' }]}>
              <Image source={require('../../assets/userProfile/cp-card.png')} resizeMode="stretch" style={{ position: 'absolute', left: px(-12.2), top: px(-79.4), width: px(411.4), height: px(412.2) }} />
            </View>
            <Text style={[at(190, 547), text(16, 'bold', colors.white)]}>CP</Text>
            <Image source={photo} style={[at(52, 606), { width: px(66), height: px(65), borderRadius: px(33), borderWidth: 2, borderColor: '#FF8A00' }]} />
            <Text numberOfLines={1} style={[at(52, 678), { width: px(80), textAlign: 'center' }, text(11, 'medium', colors.white)]}>
              {name}
            </Text>
            <Image source={require('../../assets/userProfile/cp-wings.png')} resizeMode="cover" style={[at(132, 613), { width: px(139), height: px(70) }]} />
            <SvgXml xml={icons.questionDisc} width={px(65)} height={px(65)} style={at(296, 606)} />
            <Text style={[at(320, 620), text(31, 'medium', '#EB11AA')]}>?</Text>
          </>
        )}

        {tab === 'wall' && (
          <>
            {/* The four pills run on past the right edge. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[at(0, 488), { width: '100%', height: px(37) }]} contentContainerStyle={{ paddingLeft: px(9), paddingRight: px(9), gap: px(9) }}>
              {PILLS.map((p) => {
                const on = pill === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPill(p)}
                    style={{ width: px(103), height: px(37), borderRadius: px(26), alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#FFC3DD' : undefined, borderWidth: on ? 0 : 1, borderColor: 'rgba(0,0,0,0.17)' }}
                  >
                    <Text style={text(17, 'medium', on ? '#F34B94' : 'rgba(0,0,0,0.43)')}>{p}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {pill === 'Gift' && (gifts?.items.length ?? 0) > 0 ? (
              <>
                <Text style={[at(13, 563), text(16, 'medium')]}>Gift</Text>
                {gifts!.items.map((g, i) => (
                  <View key={g.gift.id} style={[at(13 + (i % 4) * 94, 611 + Math.floor(i / 4) * 101), { width: px(86), height: px(89), borderRadius: px(9), overflow: 'hidden' }]}>
                    <LinearGradient colors={['#D3E5FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
                    {g.gift.thumbnail_url ? <Image source={{ uri: g.gift.thumbnail_url }} resizeMode="contain" style={[at(20, 16), { width: px(40), height: px(45) }]} /> : null}
                    <View style={[at(57, 5), { width: px(25), height: px(18), borderRadius: px(19), backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={text(12, 'semiBold', colors.white)}>x{g.quantity}</Text>
                    </View>
                    <Text numberOfLines={1} style={[at(0, 64), { width: px(86), textAlign: 'center', opacity: 0.6 }, text(12, 'medium')]}>
                      {g.gift.name_en ?? ''}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              empty
            )}
          </>
        )}

        {tab === 'moment' &&
          (posts && posts.length > 0 ? (
            posts.map((post, i) => {
              const top = 499 + i * 229;
              const stamp = formatStamp(post.created_at, person?.country ?? null);
              const media = post.media_urls?.[0];
              return (
                <View key={post.uuid}>
                  <Pressable onPress={() => navigation.navigate('PostDetails', { post })} style={[at(16, top), { width: px(197), height: px(180), borderRadius: px(6), backgroundColor: colors.black, overflow: 'hidden', justifyContent: 'center' }]}>
                    {media && post.type === 'image' ? <Image source={{ uri: media }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
                    {post.type === 'text' ? <Text numberOfLines={6} style={[{ padding: px(12) }, text(13, 'regular', colors.white)]}>{post.body}</Text> : null}
                    {post.type === 'audio' ? <Text style={[{ textAlign: 'center', fontSize: px(32), color: colors.white }]}>▶</Text> : null}
                  </Pressable>
                  <View style={[at(16, top + 189), { flexDirection: 'row', gap: px(9) }]}>
                    <Text style={[text(13, 'regular'), { opacity: 0.3 }]}>{stamp.date}</Text>
                    <Text style={[text(13, 'regular'), { opacity: 0.3 }]}>{stamp.time}</Text>
                  </View>
                  <MomentCounts style={at(290, top + 171)} likes={post.like_count} comments={post.comment_count} />
                </View>
              );
            })
          ) : posts ? (
            empty
          ) : null)}

        {/* Chat / Send Gift — 140 x 47, 43 apart, centred; Figma's Wall frames put them at y 800. */}
        {person && !person.is_self && (
          <View style={[at(0, footerTop), { width: '100%', alignItems: 'center' }]}>
            <Pressable
              onPress={toggleFollow}
              disabled={followBusy}
              style={{ height: px(40), paddingHorizontal: px(34), borderRadius: px(20), alignItems: 'center', justifyContent: 'center', backgroundColor: person.is_following ? '#EEEEF0' : '#FF3300', opacity: followBusy ? 0.6 : 1 }}
            >
              <Text style={[text(15, 'medium'), { color: person.is_following ? '#333333' : '#FFFFFF' }]}>{person.is_following ? 'Following' : '+ Follow'}</Text>
            </Pressable>
          </View>
        )}
        {person && !person.is_self && (
          <View style={[at(0, footerTop + 56), { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: px(43) }]}>
            <Pressable onPress={() => chat()} style={styles.pillButton(px)}>
              <Text style={text(16, 'medium')}>Chat</Text>
            </Pressable>
            <Pressable onPress={() => chat(true)} style={styles.pillButton(px)}>
              <Text style={text(16, 'medium')}>Send Gift</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = {
  ...StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.white } }),
  pillButton: (px: (v: number) => number) => ({
    width: px(140),
    height: px(47),
    borderRadius: px(29),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.43)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }),
};

