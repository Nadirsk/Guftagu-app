import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import type { FeedItem } from './parts';

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: {
    post_uuid?: string;
    user_uuid?: string;
    [key: string]: unknown;
  } | null;
  image_url?: string | null;
  deep_link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at?: string | null;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MomentNotifications'>;

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function MomentNotificationsScreen() {
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [navigatingNotificationId, setNavigatingNotificationId] = useState<number | null>(null);

  const fetchNotifications = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const res = await api<NotificationItem[]>('/notifications?per_page=50', { token }).catch(
          () => [],
        );
        const list = Array.isArray(res) ? res : [];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.is_read).length);
      } catch {
        // quiet fail preserves existing list
      } finally {
        if (!quiet) setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  // Initial load and focus effect
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(true);
    }, [fetchNotifications]),
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time polling every 4s while on screen
  useEffect(() => {
    const timer = setInterval(() => {
      fetchNotifications(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await api('/notifications/read-all', { method: 'POST', token });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // keep state on error
    }
  }, [token]);

  const handleNotificationPress = useCallback(
    async (item: NotificationItem) => {
      // Mark as read immediately in UI and backend
      if (!item.is_read) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        api(`/notifications/${item.id}/read`, { method: 'POST', token }).catch(() => {});
      }

        // If notification has a post, navigate to PostDetails
        const postUuid = item.data?.post_uuid;
        if (postUuid) {
          setNavigatingNotificationId(item.id);
          try {
            const res = await api<{ post: FeedItem } | FeedItem>(`/posts/${postUuid}`, { token });
            const post = res && 'post' in res && res.post ? res.post : (res as FeedItem);
            if (post && post.uuid) {
              navigation.navigate('PostDetails', { post });
            }
          } catch {
            // post may have been deleted
          } finally {
            setNavigatingNotificationId(null);
          }
        }
    },
    [navigation, token],
  );

  const renderIcon = (type: string) => {
    switch (type) {
      case 'post.liked':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FFE8E0' }]}>
            <Heart size={px(18)} color={colors.postButton} fill={colors.postButton} />
          </View>
        );
      case 'post.commented':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#E0F0FF' }]}>
            <MessageCircle size={px(18)} color={colors.commentReply} />
          </View>
        );
      case 'follow.new':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#E4F8E8' }]}>
            <UserPlus size={px(18)} color="#15803D" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
            <Bell size={px(18)} color={colors.black} />
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isNavigating = navigatingNotificationId === item.id;

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        disabled={navigatingNotificationId !== null}
        style={[styles.notificationCard, !item.is_read ? styles.unreadCard : null]}
      >
        {renderIcon(item.type)}
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, !item.is_read ? styles.unreadText : null]}>
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.cardBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {isNavigating ? (
          <ActivityIndicator size="small" color={colors.postButton} style={{ marginLeft: 8 }} />
        ) : !item.is_read ? (
          <View style={styles.unreadDot} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={px(24)} color={colors.black} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>

        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8} style={styles.markAllBtn}>
            <CheckCheck size={px(18)} color={colors.linkBlue} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: px(24) }} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.postButton} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.postButton}
              colors={[colors.postButton]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Bell size={px(36)} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                When someone likes or comments on your moments, you'll see it here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 18,
    color: colors.black,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.linkBlue,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  unreadCard: {
    backgroundColor: 'rgba(7,143,255,0.04)',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.black,
  },
  unreadText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  cardTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  cardBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.linkBlue,
    marginLeft: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 18,
    color: colors.black,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
