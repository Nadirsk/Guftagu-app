import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../api/client';
import * as icons from '../assets/home/icons';
import { useAuth } from '../auth/AuthContext';
import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

const avatarPlaceholder = require('../assets/avatar-placeholder.png');

/**
 * Search — Figma nodes 25:372 and 25:390. Those are two frames but one screen:
 * the header and the field are identical, and only what sits below them changes.
 * Under two characters there is nothing to search for, so the screen shows the
 * recent-search list (25:383); past that it shows people (25:450).
 *
 * Two characters is not an arbitrary choice — it is `SearchService::MIN_TERM` on
 * the backend, which returns an empty result below it. Matching it here keeps the
 * screen from firing requests that cannot match anything.
 */

// Every number is a design pixel on the 402x874 frame.
const D = {
  // `titleHeight` is the Figma text box (node 25:377). Without it the title's own
  // line box is taller than 28 and centring the row pushes the back arrow down.
  header: { x: 16, y: 68, width: 221, back: 26, titleSize: 22, titleHeight: 28 }, // node 25:378
  field: {
    x: 16,
    y: 134,
    width: 370,
    height: 56,
    radius: 33,
    icon: { x: 21, y: 14, size: 25 }, // node 25:380
    textX: 56, // node 25:396 — the typed value's left edge
    textSize: 15,
  },
  historyLabel: { x: 16, y: 225, size: 14, opacity: 0.34 }, // node 25:383
  /** Recent-search rows are not drawn in Figma; only their heading is. */
  historyRow: { height: 44, gap: 12, iconSize: 18, textSize: 15 },
  results: { x: 16, y: 228, width: 370, gap: 31 }, // node 25:450
  row: {
    height: 66,
    avatar: 66,
    gap: 11,
    /**
     * Figma's text block is a fixed 92 wide (node 25:403), measured in Delight.
     * Poppins is wider, so a name like "Vishal._233" got ellipsized inside it.
     * The block fills the gap between the avatar and the Follow chip instead —
     * both of which keep their exact Figma positions — so the name has room and
     * only a genuinely long one truncates.
     */
    textGutter: 8,
    textTop: 10.5,
    textGap: 3,
    nameSize: 18,
    nameHeight: 23,
    idSize: 15,
    idHeight: 19,
    idOpacity: 0.3,
  }, // nodes 25:404 / 25:403
  follow: {
    x: 234,
    y: 13.5,
    width: 136,
    height: 39, // node 25:422
    // The two exported hexagons overhang their box; these are the offsets Figma's
    // own insets work out to, so the drawn shape lands exactly on 136x39.
    outer: { x: -1.564, y: -1, width: 139.132, height: 41 }, // node 25:415
    inner: { x: -2, y: -2, width: 134, height: 44 }, // node 25:419
    // `labelHeight` is the Figma text box (node 25:417). The row centres its
    // children, so without it the taller default line box pushes the + down.
    content: { x: 35, y: 10, icon: 16, gap: 3, labelSize: 15, labelHeight: 19 }, // node 25:420
  },
};

const MIN_TERM = 2;
const DEBOUNCE_MS = 300;

type SearchUser = {
  uuid: string;
  guftagu_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type HistoryEntry = {
  uuid: string;
  type: string;
  term: string;
  target_uuid: string | null;
  searched_at: string | null;
};

/** Node 25:422 — the hexagonal Follow chip. */
function FollowButton({
  following,
  busy,
  onPress,
}: {
  following: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const { px } = useDesignScale();
  const { follow } = D;

  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={{ width: px(follow.width), height: px(follow.height), opacity: busy ? 0.6 : 1 }}
    >
      <SvgXml
        xml={icons.followOuter}
        width={px(follow.outer.width)}
        height={px(follow.outer.height)}
        style={{ position: 'absolute', left: px(follow.outer.x), top: px(follow.outer.y) }}
      />
      <SvgXml
        xml={icons.followInner}
        width={px(follow.inner.width)}
        height={px(follow.inner.height)}
        style={{ position: 'absolute', left: px(follow.inner.x), top: px(follow.inner.y) }}
      />
      <View
        style={[
          styles.followContent,
          { left: px(follow.content.x), top: px(follow.content.y), gap: px(follow.content.gap) },
        ]}
      >
        {following ? null : (
          <Plus size={px(follow.content.icon)} color={colors.followLabel} strokeWidth={2} />
        )}
        <Text
          style={[
            styles.followLabel,
            {
              fontSize: px(follow.content.labelSize),
              lineHeight: px(follow.content.labelHeight),
            },
          ]}
        >
          {following ? 'Following' : 'Follow'}
        </Text>
      </View>
    </Pressable>
  );
}

function ResultRow({
  person,
  following,
  busy,
  onToggleFollow,
}: {
  person: SearchUser;
  following: boolean;
  busy: boolean;
  onToggleFollow: () => void;
}) {
  const { px } = useDesignScale();
  const { row } = D;

  return (
    <View style={[styles.row, { height: px(row.height), width: px(D.results.width) }]}>
      <View style={[styles.rowLeft, { gap: px(row.gap), marginRight: px(row.textGutter) }]}>
        <Image
          source={person.avatar_url ? { uri: person.avatar_url } : avatarPlaceholder}
          style={{ width: px(row.avatar), height: px(row.avatar), borderRadius: px(row.avatar / 2) }}
        />
        <View style={{ flex: 1, gap: px(row.textGap) }}>
          <Text
            numberOfLines={1}
            style={[
              styles.rowName,
              { fontSize: px(row.nameSize), lineHeight: px(row.nameHeight) },
            ]}
          >
            {person.display_name ?? 'Guftagu user'}
          </Text>
          {person.guftagu_id ? (
            <Text
              numberOfLines={1}
              style={[styles.rowId, { fontSize: px(row.idSize), lineHeight: px(row.idHeight) }]}
            >
              ID: {person.guftagu_id}
            </Text>
          ) : null}
        </View>
      </View>

      <FollowButton following={following} busy={busy} onPress={onToggleFollow} />
    </View>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { px } = useDesignScale();
  const { token } = useAuth();

  const topInset = Math.max(insets.top, 16);
  const headerY = topInset + 8;
  const topShift = D.header.y - headerY;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState<Record<string, boolean>>({});

  const term = query.trim();
  const searching = term.length >= MIN_TERM;

  // Recent searches are only ever shown in the empty state, so one fetch is enough.
  useEffect(() => {
    let cancelled = false;
    api<HistoryEntry[]>('/search/history', { token })
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        /* an unavailable history is not worth an error banner over the whole screen */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // One in-flight request at a time: without the counter a slow early keystroke
  // can land after a fast later one and overwrite the newer results.
  const requestId = useRef(0);

  useEffect(() => {
    if (!searching) {
      setResults([]);
      setError(undefined);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api<{ users: SearchUser[] }>(
          `/search?type=users&limit=20&q=${encodeURIComponent(term)}`,
          { token },
        );
        if (requestId.current !== id) return;
        setResults(data.users);
        setError(undefined);
      } catch (e) {
        if (requestId.current !== id) return;
        setResults([]);
        setError(e instanceof ApiError ? e.displayMessage : 'Could not search right now.');
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, searching, token]);

  /** Only a submitted search is worth remembering, not every keystroke. */
  const remember = useCallback(async () => {
    if (!searching) return;
    try {
      await api<{ uuid: string }>('/search/history', {
        method: 'POST',
        body: { term },
        token,
      });
      const data = await api<HistoryEntry[]>('/search/history', { token });
      setHistory(data);
    } catch {
      /* the results are already on screen; a failed history write changes nothing */
    }
  }, [searching, term, token]);

  const toggleFollow = useCallback(
    async (person: SearchUser) => {
      const next = !followed[person.uuid];
      setFollowBusy((b) => ({ ...b, [person.uuid]: true }));
      setFollowed((f) => ({ ...f, [person.uuid]: next }));
      try {
        await api(`/users/${person.uuid}/follow`, {
          method: next ? 'POST' : 'DELETE',
          token,
        });
      } catch {
        // Put the button back rather than leaving it claiming something untrue.
        setFollowed((f) => ({ ...f, [person.uuid]: !next }));
      } finally {
        setFollowBusy((b) => ({ ...b, [person.uuid]: false }));
      }
    },
    [followed, token],
  );

  return (
    <View style={styles.screen}>
      {/* node 25:378 — back arrow and title, `justify-between` across 221 */}
      <View
        style={[
          styles.header,
          { left: px(D.header.x), top: px(D.header.y - topShift), width: px(D.header.width) },
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={px(D.header.back)} color={colors.black} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { fontSize: px(D.header.titleSize), lineHeight: px(D.header.titleHeight) },
          ]}
        >
          Search
        </Text>
      </View>

      {/* node 25:379 / 25:394 */}
      <View
        style={[
          styles.field,
          {
            left: px(D.field.x),
            top: px(D.field.y - topShift),
            width: px(D.field.width),
            height: px(D.field.height),
            borderRadius: px(D.field.radius),
          },
        ]}
      >
        <View
          style={{ position: 'absolute', left: px(D.field.icon.x), top: px(D.field.icon.y) }}
        >
          <SvgXml
            xml={icons.searchLarge}
            width={px(D.field.icon.size)}
            height={px(D.field.icon.size)}
          />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={remember}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Enter the name"
          placeholderTextColor={colors.searchPlaceholder}
          style={[
            styles.fieldInput,
            {
              left: px(D.field.textX),
              right: px(16),
              fontSize: px(D.field.textSize),
            },
          ]}
        />
      </View>

      {searching ? (
        <View
          style={{
            position: 'absolute',
            left: px(D.results.x),
            top: px(D.results.y - topShift),
            right: px(D.results.x),
            bottom: 0,
          }}
        >
          {loading && results.length === 0 ? (
            <ActivityIndicator color={colors.black} style={{ marginTop: px(24) }} />
          ) : error ? (
            <Text style={[styles.notice, { fontSize: px(15) }]}>{error}</Text>
          ) : results.length === 0 ? (
            <Text style={[styles.notice, { fontSize: px(15) }]}>No one found for “{term}”.</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.uuid}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                gap: px(D.results.gap),
                paddingBottom: insets.bottom + px(24),
              }}
              renderItem={({ item }) => (
                <ResultRow
                  person={item}
                  following={followed[item.uuid] ?? false}
                  busy={followBusy[item.uuid] ?? false}
                  onToggleFollow={() => toggleFollow(item)}
                />
              )}
            />
          )}
        </View>
      ) : (
        <>
          {/* node 25:383 */}
          <Text
            style={[
              styles.historyLabel,
              {
                left: px(D.historyLabel.x),
                top: px(D.historyLabel.y - topShift),
                fontSize: px(D.historyLabel.size),
              },
            ]}
          >
            Search History
          </Text>

          {/* Figma draws the heading but no rows, so these follow the screen's own
              type: the term in the same size and colour as a typed query. */}
          <FlatList
            data={history}
            keyExtractor={(item) => item.uuid}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{
              position: 'absolute',
              left: px(D.historyLabel.x),
              right: px(D.historyLabel.x),
              top: px(D.historyLabel.y + 26 - topShift),
              bottom: 0,
            }}
            contentContainerStyle={{ paddingBottom: insets.bottom + px(24) }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setQuery(item.term)}
                style={[
                  styles.historyRow,
                  { height: px(D.historyRow.height), gap: px(D.historyRow.gap) },
                ]}
              >
                <SvgXml
                  xml={icons.search}
                  width={px(D.historyRow.iconSize)}
                  height={px(D.historyRow.iconSize)}
                  opacity={0.34}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.historyTerm, { fontSize: px(D.historyRow.textSize) }]}
                >
                  {item.term}
                </Text>
              </Pressable>
            )}
          />
        </>
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
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  field: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.searchFieldBorder,
  },
  fieldInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  historyLabel: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    opacity: 0.34,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTerm: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  notice: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowName: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  rowId: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    opacity: 0.3,
  },
  followContent: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  followLabel: {
    fontFamily: typography.fontFamily.regular,
    color: colors.followLabel,
  },
});
