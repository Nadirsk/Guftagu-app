import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { ChevronRight, Play } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '../../api/client';
import * as icons from '../../assets/profile/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BOTTOM_NAV_HEIGHT } from '../home/BottomNav';
import type { FeedItem } from '../moment/parts';
import { isVideoUrl } from '../moment/parts';

/**
 * Profile — the Mine tab. Figma 676:4517 (Moment tab), 595:3620 (Gift tab with
 * gifts) and 640:5816 (Gift tab, empty), file ODEXeeT7yuiT9r7AG4Q3Gh. Laid out on
 * the 402-wide frame's own coordinates; Delight is set in Poppins, as elsewhere.
 *
 * Everything shown is the signed-in user's: `auth/me`, `wallet`,
 * `users/{uuid}/stats`, `users/{uuid}/posts` and `users/{uuid}/gifts`. The rows
 * that lead to screens the app does not have yet (Store, Medals, Level, …) say so.
 */

const AVATAR = require('../../assets/avatar-placeholder.png');
const BADGES = require('../../assets/room/badge-strip.png');

type Stats = { following: number; followers: number; visitors: number | null };
type Wallet = { coin_balance: number; diamond_balance: number };
type GiftRow = { gift: { id: number; name_en: string; thumbnail_url: string | null }; quantity: number };
type Gifts = { earned: number | null; spent: number | null; items: GiftRow[] };

/** Moment card geometry (Frame 1597881267): one moment is 237 tall from y 88. */
const MOMENT = { top: 88, step: 237, thumb: { x: 20, width: 197, height: 180 } } as const;

export default function ProfileScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, token, signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [posts, setPosts] = useState<FeedItem[] | null>(null);
  const [tab, setTab] = useState<'Moment' | 'Gift'>('Moment');
  const [direction, setDirection] = useState<'received' | 'sent'>('received');
  const [gifts, setGifts] = useState<Gifts | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    api<Stats>(`/users/${user.uuid}/stats`, { token }).then(setStats).catch(() => undefined);
    api<Wallet>('/wallet', { token }).then(setWallet).catch(() => undefined);
    api<FeedItem[]>(`/users/${user.uuid}/posts?limit=20`, { token }).then(setPosts).catch(() => setPosts([]));
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user || tab !== 'Gift') return;
      setGifts(null);
      api<Gifts>(`/users/${user.uuid}/gifts?direction=${direction}`, { token }).then(setGifts).catch(() => setGifts({ earned: 0, spent: 0, items: [] }));
    }, [direction, tab, token, user]),
  );

  const soon = (what: string) => Alert.alert(what, 'Coming soon');

  // The Moment / Gift card grows with what it holds; Figma's are 349 and 389 tall.
  const momentCount = posts?.length ?? 0;
  const giftRows = Math.ceil((gifts?.items.length ?? 0) / 4);
  const boxHeight =
    tab === 'Moment'
      ? momentCount > 0
        ? MOMENT.top + momentCount * MOMENT.step + 24
        : 349
      : Math.max(389, 205 + giftRows * 95 + 20);
  const contentHeight = 1239 + boxHeight + 40;

  const shadow = (opacity: number, radius: number) =>
    ({ shadowColor: '#000', shadowOpacity: opacity, shadowRadius: px(radius / 2), shadowOffset: { width: 0, height: px(4) }, elevation: 3 }) as const;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ height: px(contentHeight) + BOTTOM_NAV_HEIGHT }} showsVerticalScrollIndicator={false}>
      {/* image 7 + Ellipse 98 — the laurel frame, the face inside it. */}
      <View style={{ position: 'absolute', left: px(14), top: px(89), width: px(147), height: px(143), overflow: 'hidden' }}>
        <Image source={require('../../assets/profile/avatar-frame.jpg')} style={{ position: 'absolute', left: px(-21.2), top: px(-18.5), width: px(185.4), height: px(185.4) }} />
      </View>
      <Image source={user?.avatar_url ? { uri: user.avatar_url } : AVATAR} style={{ position: 'absolute', left: px(41), top: px(114), width: px(87), height: px(87), borderRadius: px(43.5) }} />

      {/* Group 1597881067 — name, gender, ID, country. */}
      <View style={{ position: 'absolute', left: px(172.5), top: px(114), flexDirection: 'row', alignItems: 'center', gap: px(6), maxWidth: px(220) }}>
        <Text numberOfLines={1} style={[styles.medium, { fontSize: px(19), color: colors.black, flexShrink: 1 }]}>
          {user?.display_name ?? 'Guftagu user'}
        </Text>
        {user?.gender === 'male' ? <SvgXml xml={icons.male} width={px(22.5)} height={px(22.5)} /> : null}
      </View>
      <Text style={[styles.regular, { position: 'absolute', left: px(172.5), top: px(144), fontSize: px(14), color: 'rgba(0,0,0,0.3)' }]}>
        {`ID : ${user?.guftagu_id ?? ''}`}
      </Text>
      {user?.country ? (
        <View style={{ position: 'absolute', left: px(172.5), top: px(170), flexDirection: 'row', alignItems: 'center', gap: px(3) }}>
          <SvgXml xml={icons.mapPin} width={px(17)} height={px(17)} />
          <Text style={[styles.regular, { fontSize: px(14), color: colors.black }]}>{user.country}</Text>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: px(15), top: px(236), width: px(92), height: px(20.16), overflow: 'hidden' }}>
        <Image source={BADGES} resizeMode="stretch" style={{ position: 'absolute', left: px(92 * 0.0065), width: px(92 * 0.9423), height: px(20.16) }} />
      </View>

      {/* Frame 1597881234 — the three counts. */}
      <View style={[{ position: 'absolute', left: px(5), top: px(275), width: px(392), height: px(94), borderRadius: px(9), borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', backgroundColor: colors.white }, shadow(0.07, 13.2)]}>
        {([
          ['Following', stats?.following, 68],
          ['Followers', stats?.followers, 201.5],
          ['Visitors', stats?.visitors, 329],
        ] as const).map(([label, value, center]) => (
          <Pressable key={label} onPress={() => soon(label)} style={{ position: 'absolute', left: px(center - 55), width: px(110), top: px(19), alignItems: 'center' }}>
            <Text style={[styles.medium, { fontSize: px(19), color: colors.black }]}>{value ?? 0}</Text>
            <Text style={[styles.medium, { marginTop: px(4), fontSize: px(14), color: 'rgba(0,0,0,0.4)' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Frame 1597881237 — the VIP banner, half under the wallet. */}
      <Pressable onPress={() => soon('VIP')} style={{ position: 'absolute', left: px(31.5), top: px(400), width: px(339), height: px(151), borderRadius: px(12), borderWidth: 1, borderColor: 'rgba(0,0,0,0.23)', backgroundColor: colors.black, overflow: 'hidden' }}>
        <Image source={require('../../assets/profile/vip-banner.jpg')} resizeMode="cover" style={{ position: 'absolute', left: px(-1), top: px(-29), width: px(331), height: px(121) }} />
        <Svg width={px(70)} height={px(36)} style={{ position: 'absolute', left: px(9), top: px(10) }}>
          <Defs>
            <SvgGradient id="vip" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.14" stopColor="#FFDE07" />
              <Stop offset="0.5" stopColor="#FFFFFF" />
              <Stop offset="0.8" stopColor="#B7610B" />
            </SvgGradient>
          </Defs>
          <SvgText x={px(35)} y={px(28)} textAnchor="middle" fontSize={px(27)} fontWeight="bold" fontStyle="italic" fontFamily={Platform.select({ ios: 'Times New Roman', default: 'serif' })} fill="url(#vip)">
            VIP
          </SvgText>
        </Svg>
        <View style={{ position: 'absolute', left: px(60), top: px(16) }}>
          <SvgXml xml={icons.star} width={px(13.5)} height={px(13.2)} />
        </View>
        <View style={{ position: 'absolute', left: px(265), top: px(4), width: px(59), height: px(52), overflow: 'hidden', transform: [{ rotate: '15deg' }] }}>
          <Image source={require('../../assets/profile/vip-gem.png')} style={{ position: 'absolute', left: px(-39.9), top: px(-31.4), width: px(131.6), height: px(118.4) }} />
        </View>
      </Pressable>

      {/* Frame 1597881236 — My Wallet. */}
      <View style={[{ position: 'absolute', left: px(16), top: px(452), width: px(370), height: px(149), borderRadius: px(12), borderWidth: 1.3, borderColor: 'rgba(0,0,0,0.23)', backgroundColor: colors.white }, shadow(0.11, 12.2)]}>
        <Text style={[styles.medium, { position: 'absolute', left: px(14), top: px(17.7), fontSize: px(13), color: colors.black }]}>My Wallet</Text>
        <WalletTile x={13.7} image={require('../../assets/profile/coin-card.jpg')} label="Coin" value={wallet?.coin_balance} onPress={() => soon('Recharge')}>
          <View style={{ position: 'absolute', left: px(118), top: px(14), width: px(34), height: px(24), overflow: 'hidden' }}>
            <Image source={require('../../assets/profile/coin-icon.png')} style={{ position: 'absolute', left: px(34 * 0.0196), width: px(34 * 0.9408), height: px(24) }} />
          </View>
        </WalletTile>
        <WalletTile x={195.7} image={require('../../assets/profile/earn-card.jpg')} label="Earnings" value={wallet?.diamond_balance} labelX={11} labelY={20} valueY={42} onPress={() => soon('Earnings')}>
          <View style={{ position: 'absolute', left: px(116), top: px(27), width: px(29), height: px(24), overflow: 'hidden' }}>
            <Image source={require('../../assets/profile/diamond.png')} style={{ position: 'absolute', left: px(-6.9), top: px(-9.1), width: px(42.8), height: px(41.3) }} />
          </View>
        </WalletTile>
      </View>

      {/* Frame 1597881238 — Reward, Item Bag, CP. */}
      <View style={[{ position: 'absolute', left: px(15), top: px(632), width: px(370), height: px(157), borderRadius: px(12), borderWidth: 1, borderColor: 'rgba(0,0,0,0.23)', backgroundColor: colors.white, flexDirection: 'row', justifyContent: 'center', paddingTop: px(32), gap: px(62) }, shadow(0.1, 11.9)]}>
        {([
          ['Reward', require('../../assets/profile/reward.jpg'), { left: 1, top: -1, size: 63 }],
          ['Item Bag', require('../../assets/profile/item-bag.jpg'), { left: -4, top: -2, size: 70 }],
          ['CP', require('../../assets/profile/cp.png'), { left: 3, top: 3, size: 59 }],
        ] as const).map(([label, image, at]) => (
          <Pressable key={label} onPress={() => soon(label)} style={{ width: px(67), alignItems: 'center', gap: px(11) }}>
            <View style={[{ width: px(67), height: px(67), borderRadius: px(11), borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)', backgroundColor: colors.white, overflow: 'hidden' }, { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: px(4.5), shadowOffset: { width: px(2), height: px(4) }, elevation: 3 }]}>
              <Image source={image} resizeMode="cover" style={{ position: 'absolute', left: px(at.left), top: px(at.top), width: px(at.size), height: px(at.size) }} />
            </View>
            <Text numberOfLines={1} style={[styles.regular, { width: px(90), textAlign: 'center', fontSize: px(13), color: colors.black }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Frame 1597881242 / 1597881243 — the two lists. */}
      <MenuCard top={808} height={280} left={20} rowTop={24}>
        <MenuRow icon={<CropIcon source={require('../../assets/profile/store.png')} box={26} at={{ left: -4.8, top: -4.6, width: 33.5, height: 34.4 }} />} gap={5} label="Store" onPress={() => soon('Store')} />
        <MenuRow icon={<RoundIcon source={require('../../assets/profile/row-icon.jpg')} size={28} border="rgba(0,0,0,0.17)" />} gap={5} label="Medals" onPress={() => soon('Medals')} />
        <MenuRow icon={<RoundIcon source={require('../../assets/profile/row-icon.jpg')} size={28} border="rgba(0,0,0,0.17)" />} gap={5} label="Level" onPress={() => soon('Level')} />
        <MenuRow icon={<RoundIcon source={require('../../assets/profile/row-icon.jpg')} size={28} border="rgba(0,0,0,0.17)" />} gap={5} label="Join Agency" onPress={() => soon('Join Agency')} />
        <MenuRow icon={<SvgXml xml={icons.micVocal} width={px(21)} height={px(21)} />} gap={11} label="Host Center" onPress={() => soon('Host Center')} />
        <MenuRow icon={<SvgXml xml={icons.micVocal} width={px(21)} height={px(21)} />} gap={11} label="Invite Reward" onPress={() => soon('Invite Reward')} />
      </MenuCard>
      <MenuCard top={1101} height={118} left={22} rowTop={23}>
        <MenuRow icon={<RoundIcon source={require('../../assets/profile/row-icon.jpg')} size={28} border="rgba(0,0,0,0.17)" />} gap={5} label="Contact" onPress={() => soon('Contact')} />
        <MenuRow
          icon={<RoundIcon source={require('../../assets/profile/settings.jpg')} size={27} border="rgba(0,0,0,0.28)" />}
          gap={9}
          label="Settings"
          onPress={() =>
            Alert.alert('Settings', undefined, [
              { text: 'Sign out', style: 'destructive', onPress: signOut },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
        />
      </MenuCard>

      {/* Frame 1597881267 — Moment / Gift. */}
      <View style={{ position: 'absolute', left: px(15), top: px(1239), width: px(370), height: px(boxHeight), borderRadius: px(17), borderWidth: 1, borderColor: 'rgba(0,0,0,0.26)', overflow: 'hidden' }}>
        {(['Moment', 'Gift'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} hitSlop={px(8)} style={{ position: 'absolute', left: px((t === 'Moment' ? 55 : 139.5) - 40), width: px(80), top: px(25), alignItems: 'center' }}>
            <Text style={[styles.medium, { fontSize: px(17), color: colors.black, opacity: tab === t ? 1 : 0.5 }]}>{t}</Text>
          </Pressable>
        ))}
        <View style={{ position: 'absolute', left: px(tab === 'Moment' ? 38 : 123), top: px(51), width: px(34), height: px(5), borderRadius: px(19), backgroundColor: '#3F79F6' }} />

        {tab === 'Moment' ? (
          posts && posts.length === 0 ? (
            <Empty top={110} />
          ) : (
            (posts ?? []).map((post, i) => (
              <MomentItem key={post.uuid} post={post} top={MOMENT.top + i * MOMENT.step} onOpen={() => navigation.navigate('PostDetails', { post })} />
            ))
          )
        ) : (
          <>
            <Text style={[styles.medium, { position: 'absolute', left: px(21), top: px(85), fontSize: px(15), color: colors.black }]}>Gift</Text>
            <Text style={[styles.regular, { position: 'absolute', right: px(14), top: px(86), fontSize: px(14), color: 'rgba(0,0,0,0.4)' }]}>
              {direction === 'received' ? `Earned ${gifts?.earned ?? 0}` : `Spent ${gifts?.spent ?? 0}`}
            </Text>
            {/* Frames 1597881596 / 97 — the grey track and the pink thumb that slides over it. */}
            <View style={{ position: 'absolute', left: px(83), top: px(141), width: px(206), height: px(35), borderRadius: px(35), backgroundColor: 'rgba(0,0,0,0.04)' }} />
            <View style={{ position: 'absolute', left: px(direction === 'received' ? 83 : 181), top: px(141), width: px(108), height: px(35), borderRadius: px(35), backgroundColor: '#EB11AA' }} />
            {(['received', 'sent'] as const).map((d) => (
              <Pressable key={d} onPress={() => setDirection(d)} style={{ position: 'absolute', left: px(d === 'received' ? 83 : 181), top: px(141), width: px(108), height: px(35), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[styles.regular, { fontSize: px(14), color: direction === d ? colors.white : 'rgba(0,0,0,0.5)' }]}>{d === 'received' ? 'Receive' : 'Send'}</Text>
              </Pressable>
            ))}
            {gifts && gifts.items.length === 0 ? <Empty top={214 - 30} /> : null}
            {(gifts?.items ?? []).map((row, i) => (
              <GiftCard key={row.gift.id} row={row} x={12 + (i % 4) * 88} y={205 + Math.floor(i / 4) * 95} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );

  function WalletTile({ x, image, label, value, labelX = 14, labelY = 14, valueY = 41, onPress, children }: { x: number; image: number; label: string; value: number | undefined; labelX?: number; labelY?: number; valueY?: number; onPress: () => void; children: React.ReactNode }) {
    return (
      <Pressable onPress={onPress} style={{ position: 'absolute', left: px(x), top: px(52.7), width: px(164), height: px(76), borderRadius: px(9), overflow: 'hidden', backgroundColor: colors.white }}>
        <Image source={image} resizeMode="cover" style={{ position: 'absolute', left: px(-11), top: px(-21), width: px(184), height: px(105), transform: [{ rotate: '180deg' }] }} />
        <Text style={[styles.medium, { position: 'absolute', left: px(labelX), top: px(labelY), fontSize: px(13), color: colors.white }]}>{label}</Text>
        <Text style={[styles.medium, { position: 'absolute', left: px(labelX), top: px(valueY), fontSize: px(13), color: colors.white }]}>{(value ?? 0).toLocaleString('en-US')}</Text>
        {children}
      </Pressable>
    );
  }

  function MenuCard({ top, height, left, rowTop, children }: { top: number; height: number; left: number; rowTop: number; children: React.ReactNode }) {
    return (
      <View style={{ position: 'absolute', left: px(15), top: px(top), width: px(370), height: px(height), borderRadius: px(17), borderWidth: 1, borderColor: 'rgba(0,0,0,0.26)' }}>
        <View style={{ position: 'absolute', left: px(left), top: px(rowTop), width: px(323), gap: px(15) }}>{children}</View>
      </View>
    );
  }

  function MenuRow({ icon, gap, label, onPress }: { icon: React.ReactNode; gap: number; label: string; onPress: () => void }) {
    return (
      <Pressable onPress={onPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: px(26) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(gap) }}>
          {icon}
          <Text style={[styles.regular, { fontSize: px(14), color: colors.black }]}>{label}</Text>
        </View>
        <ChevronRight size={px(22)} color="#1D1B20" strokeWidth={2} />
      </Pressable>
    );
  }

  function RoundIcon({ source, size, border }: { source: number; size: number; border: string }) {
    return <Image source={source} style={{ width: px(size), height: px(size), borderRadius: px(size / 2 + 0.5), borderWidth: 1, borderColor: border }} />;
  }

  function CropIcon({ source, box, at }: { source: number; box: number; at: { left: number; top: number; width: number; height: number } }) {
    return (
      <View style={{ width: px(box), height: px(box), overflow: 'hidden' }}>
        <Image source={source} style={{ position: 'absolute', left: px(at.left), top: px(at.top), width: px(at.width), height: px(at.height) }} />
      </View>
    );
  }

  function Empty({ top }: { top: number }) {
    // Frame 1597881546 — the illustration and "Nothing to show here.".
    return (
      <View style={{ position: 'absolute', left: px(107), top: px(top), width: px(155), alignItems: 'center', gap: px(8) }}>
        <View style={{ width: px(155), height: px(122), overflow: 'hidden' }}>
          <Image source={require('../../assets/profile/empty.png')} style={{ position: 'absolute', left: px(155 * -0.5484), top: px(122 * -0.1742), width: px(155 * 2.0516), height: px(122 * 1.9549) }} />
        </View>
        <Text style={[styles.regular, { fontSize: px(13), color: 'rgba(0,0,0,0.5)', textAlign: 'center' }]}>Nothing to show here.</Text>
      </View>
    );
  }

  function GiftCard({ row, x, y }: { row: GiftRow; x: number; y: number }) {
    // Frame 1597881598 — a pale-blue tile, the gift, how many, its name.
    return (
      <View style={{ position: 'absolute', left: px(x), top: px(y), width: px(86), height: px(89), borderRadius: px(9), overflow: 'hidden' }}>
        <LinearGradient colors={['#D3E5FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        {row.gift.thumbnail_url ? (
          <Image source={{ uri: row.gift.thumbnail_url }} resizeMode="contain" style={{ position: 'absolute', left: px(20), top: px(16), width: px(45), height: px(45) }} />
        ) : null}
        <View style={{ position: 'absolute', left: px(57), top: px(5), minWidth: px(25), height: px(18), paddingHorizontal: px(4), borderRadius: px(19), backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.semiBold, { fontSize: px(11), color: colors.white }]}>{`x${row.quantity}`}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.medium, { position: 'absolute', left: px(2), right: px(2), top: px(64), textAlign: 'center', fontSize: px(11), color: 'rgba(0,0,0,0.6)' }]}>{row.gift.name_en}</Text>
      </View>
    );
  }

  function MomentItem({ post, top, onOpen }: { post: FeedItem; top: number; onOpen: () => void }) {
    const url = post.media_urls?.[0];
    const at = post.created_at ? new Date(post.created_at) : null;
    const date = at ? `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}` : '';
    const time = at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}:${String(at.getSeconds()).padStart(2, '0')}` : '';
    return (
      <>
        <Pressable onPress={onOpen} style={{ position: 'absolute', left: px(MOMENT.thumb.x), top: px(top), width: px(MOMENT.thumb.width), height: px(MOMENT.thumb.height), borderRadius: px(6), backgroundColor: url ? colors.black : 'rgba(0,0,0,0.05)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {url && !isVideoUrl(url) ? <Image source={{ uri: url }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
          {url && isVideoUrl(url) ? <Play size={px(33)} color={colors.white} fill={colors.white} strokeWidth={0} /> : null}
          {!url ? <Text numberOfLines={6} style={[styles.regular, { padding: px(12), fontSize: px(13), color: colors.black }]}>{post.body}</Text> : null}
        </Pressable>
        <Pressable onPress={() => Share.share({ message: post.body ?? 'A moment on Guftagu' })} hitSlop={px(8)} style={{ position: 'absolute', left: px(273), top: px(top + 22) }}>
          <SvgXml xml={icons.send} width={px(32.8)} height={px(32.8)} />
        </Pressable>
        <View style={{ position: 'absolute', left: px(20), top: px(top + 189), flexDirection: 'row', gap: px(9) }}>
          <Text style={[styles.regular, { fontSize: px(12), color: 'rgba(0,0,0,0.3)' }]}>{date}</Text>
          <Text style={[styles.regular, { fontSize: px(12), color: 'rgba(0,0,0,0.3)' }]}>{`${time}${user?.country ? ` - ${user.country}` : ''}`}</Text>
        </View>
        <View style={{ position: 'absolute', left: px(271), top: px(top + 213), flexDirection: 'row', alignItems: 'center', gap: px(17) }}>
          <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: px(5) }}>
            <SvgXml xml={icons.chatDots} width={px(24)} height={px(24)} />
            <Text style={[styles.regular, { fontSize: px(12), color: '#8E8E93' }]}>{post.comment_count ?? 0}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(5) }}>
            <SvgXml xml={icons.thumbsUp} width={px(24)} height={px(24)} />
            <Text style={[styles.regular, { fontSize: px(12), color: '#8E8E93' }]}>{post.like_count ?? 0}</Text>
          </View>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  regular: { fontFamily: typography.fontFamily.regular },
  medium: { fontFamily: typography.fontFamily.medium },
  semiBold: { fontFamily: typography.fontFamily.semiBold },
});
