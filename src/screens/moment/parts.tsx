import { Play, Plus } from 'lucide-react-native';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * The pieces the Moment feed (25:451 / 96:1072) and Post Details (77:799 /
 * 86:919) both draw. Figma uses the same nodes on every one of those frames, so
 * they live here rather than being re-measured per screen.
 *
 * Every number is a design pixel on the 402x874 frame.
 */

const avatarPlaceholder = require('../../assets/avatar-placeholder.png');
export const badgeStrip = require('../../assets/home/moment-badges.png');

/** Node 77:805 / 73:696 — avatar, name, badge strip, and a trailing control. */
export const AUTHOR = {
  width: 369,
  height: 66,
  avatar: { x: 0, y: 0, size: 66 },
  /** `flex-col gap-[2px] w-[92px]`, 9 past the avatar. */
  name: { x: 75, y: 10.42, width: 92, size: 18, height: 23, gap: 2 },
  /**
   * Node 73:695 — `aspect-[73/16]` on a 92-wide block, and the bitmap inside it
   * sits at `left-[0.65%] w-[94.23%] h-full`.
   */
  badges: { width: 92, height: 20.164, imageX: 0.598, imageWidth: 86.69 },
  follow: { x: 233, y: 13.5, width: 136, height: 39 }, // node 77:811
  /** Node 77:781 + Line 84-89 — only a live author's avatar carries these. */
  wave: {
    x: 38,
    y: 44,
    size: 26,
    bars: [
      { x: 7, y: 10, length: 8 },
      { x: 9, y: 8, length: 11 },
      { x: 11, y: 10, length: 8 },
      { x: 13, y: 11, length: 6 },
      { x: 15, y: 8, length: 11 },
      { x: 17, y: 11, length: 6 },
    ],
  },
} as const;

/** Node 77:817 / 77:744 — the black thumbnail and its date/time row. */
export const MEDIA = {
  width: 197,
  height: 180,
  radius: 6,
  play: 33,
  gap: 9,
  meta: { size: 13, height: 16, gap: 9 },
  /**
   * Figma draws one thumbnail per post, so a moment carrying several had
   * nothing to show them in. Two or more become a three-across grid of squares
   * running from the thumbnail's own left edge out to the screen margin, and
   * wrapping — nine media is three full rows. One stays the frame's 197x180.
   */
  grid: { columns: 3, gap: 9, right: 386 },
} as const;

/**
 * What the author actually wrote. Figma's frames carry no `body` on any post,
 * so nothing drew it — but every real moment has one, and a feed of pictures
 * with the words left off is not the post. It sits where the reference app puts
 * it: under the name, above the thumbnails, on the thumbnails' own left edge
 * and running out to the screen margin.
 *
 * 15px sits between the 18px name above it and the 13px date below — the same
 * order of importance, in the same type.
 */
export const BODY = { size: 15, lineHeight: 21, gap: 9, right: 386 } as const;

/**
 * The body, and — through `onHeight` — how tall it turned out, in design
 * pixels. Two lines of it is one height and one line is another, and everything
 * under it is placed against whichever it is, so it has to be measured rather
 * than assumed.
 */
export function PostBody({
  text,
  left,
  top,
  lines,
  onHeight,
  onPress,
}: {
  text: string;
  left: number;
  top: number;
  /** Clamp, for the feed. Post Details leaves it out and shows all of it. */
  lines?: number;
  onHeight?: (height: number) => void;
  onPress?: () => void;
}) {
  const { px, ratio } = useDesignScale();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        position: 'absolute',
        left: px(left),
        width: px(BODY.right - left),
        top: px(top),
      }}
    >
      <Text
        numberOfLines={lines}
        onLayout={(e) => onHeight?.(e.nativeEvent.layout.height / ratio)}
        style={[
          styles.body,
          {
            fontSize: px(BODY.size),
            lineHeight: px(BODY.lineHeight),
          },
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

/** The side of one grid square, for a block whose left edge is `left`. */
export function mediaTile(left: number): number {
  const { columns, gap, right } = MEDIA.grid;
  return (right - left - gap * (columns - 1)) / columns;
}

/**
 * How tall the thumbnail area is, which is what everything under it is placed
 * against — a three-image post is shorter than a one-image post, a seven-image
 * post is taller.
 */
export function mediaBlockHeight(post: FeedItem, left: number): number {
  const count = (post.media_urls ?? []).length;
  if (count === 0) return 0;
  if (count < 2) return MEDIA.height;
  const rows = Math.ceil(count / MEDIA.grid.columns);
  return rows * mediaTile(left) + (rows - 1) * MEDIA.grid.gap;
}

/**
 * Whether a stored URL points at a clip. `posts.type` records only the heaviest
 * kind in the set, so a post mixing photos and video needs this per tile.
 */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm|3gp)(\?|$)/i.test(url);
}

/**
 * Node 77:811 is the same Group 8930 the Search screen draws, so the two
 * exported hexagons and the offsets their overhang works out to are reused.
 */
const FOLLOW = {
  outer: { x: -1.564, y: -1, width: 139.132, height: 41 }, // node 77:812
  inner: { x: -2, y: -2, width: 134, height: 44 }, // node 77:813
  content: { x: 35, y: 10, icon: 16, gap: 3, labelSize: 15, labelHeight: 19 }, // node 77:814
} as const;

const WAVE_BARS: Record<number, string> = {
  6: icons.momentWaveBar6,
  8: icons.momentWaveBar8,
  11: icons.momentWaveBar11,
};

/** `SocialPresenter::user()` — verified against app/Support/SocialPresenter.php. */
export type PostAuthor = {
  uuid: string;
  guftagu_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** Added to the presenter for the feed's "- India" suffix. */
  country: string | null;
};

/** `SocialPresenter::post()`. `body` and `liked_by_me` are dropped when null. */
export type Moment = {
  uuid: string;
  author: PostAuthor | null;
  type: 'text' | 'image' | 'audio';
  body?: string;
  media_urls?: string[];
  visibility: string;
  like_count: number;
  comment_count: number;
  is_hidden: boolean;
  liked_by_me?: boolean;
  created_at: string | null;
};

/**
 * `live` is the only thing a feed row carries that `GET /feed` has no field
 * for: the wave badge Figma draws on a broadcasting author (node 77:781). The
 * drawing is kept for when the backend reports it; nothing sets it today, so
 * nothing wears it.
 */
export type FeedItem = Moment & { live?: boolean };

/** Figma renders `2026-08-25` and `04:23:22 - India` from one timestamp. */
export function formatStamp(iso: string | null, country: string | null) {
  if (!iso) return { date: '', time: '' };
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  return {
    date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    time: country ? `${time} - ${country}` : time,
  };
}

export function avatarSource(post: { author?: PostAuthor | null }) {
  return post.author?.avatar_url ? { uri: post.author.avatar_url } : avatarPlaceholder;
}

/** Node 77:811 — the hexagonal Follow chip. */
export function FollowChip({
  following,
  busy,
  onPress,
}: {
  following: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const { px } = useDesignScale();

  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={{
        width: px(AUTHOR.follow.width),
        height: px(AUTHOR.follow.height),
        opacity: busy ? 0.6 : 1,
      }}
    >
      <SvgXml
        xml={icons.followOuter}
        width={px(FOLLOW.outer.width)}
        height={px(FOLLOW.outer.height)}
        style={{ position: 'absolute', left: px(FOLLOW.outer.x), top: px(FOLLOW.outer.y) }}
      />
      <SvgXml
        xml={icons.followInner}
        width={px(FOLLOW.inner.width)}
        height={px(FOLLOW.inner.height)}
        style={{ position: 'absolute', left: px(FOLLOW.inner.x), top: px(FOLLOW.inner.y) }}
      />
      <View
        style={[
          styles.followContent,
          { left: px(FOLLOW.content.x), top: px(FOLLOW.content.y), gap: px(FOLLOW.content.gap) },
        ]}
      >
        {following ? null : (
          <Plus size={px(FOLLOW.content.icon)} color={colors.followLabel} strokeWidth={2} />
        )}
        <Text
          style={[
            styles.followLabel,
            {
              fontSize: px(FOLLOW.content.labelSize),
              lineHeight: px(FOLLOW.content.labelHeight),
            },
          ]}
        >
          {following ? 'Following' : 'Follow'}
        </Text>
      </View>
    </Pressable>
  );
}

/** Node 77:781 + Line 84-89 — the audio-wave badge on a live author's avatar. */
export function WaveBadge() {
  const { px } = useDesignScale();
  const { wave } = AUTHOR;

  return (
    <View style={{ position: 'absolute', left: px(wave.x), top: px(wave.y) }}>
      <SvgXml xml={icons.momentWaveDisc} width={px(wave.size)} height={px(wave.size)} />
      {wave.bars.map((bar) => (
        <SvgXml
          key={bar.x}
          xml={WAVE_BARS[bar.length]}
          // Figma draws each bar as a horizontal line turned 90°, so the
          // export's own width is the bar's height on screen.
          width={px(1)}
          height={px(bar.length)}
          style={{ position: 'absolute', left: px(bar.x), top: px(bar.y) }}
        />
      ))}
    </View>
  );
}

/** Node 73:695 — one flattened bitmap of the level pill and the heart. */
export function BadgeStrip({ left, top }: { left: number; top: number }) {
  const { px } = useDesignScale();

  return (
    <Image
      source={badgeStrip}
      style={{
        position: 'absolute',
        left: px(left + AUTHOR.badges.imageX),
        top: px(top),
        width: px(AUTHOR.badges.imageWidth),
        height: px(AUTHOR.badges.height),
      }}
    />
  );
}

/**
 * Node 77:805 — `flex items-center justify-between w-[369px]`. `trailing` is
 * whatever the frame puts on the right: a Follow chip on the Moment tab and on
 * Post Details, the overflow dots on Following.
 */
export function AuthorRow({
  post,
  left,
  top,
  trailing,
  onPressName,
}: {
  post: FeedItem;
  left: number;
  top: number;
  trailing?: React.ReactNode;
  onPressName?: () => void;
}) {
  const { px } = useDesignScale();
  const { avatar, name } = AUTHOR;

  return (
    <View
      style={{
        position: 'absolute',
        left: px(left),
        top: px(top),
        width: px(AUTHOR.width),
        height: px(AUTHOR.height),
      }}
    >
      <Pressable onPress={onPressName} disabled={!onPressName}>
        <Image
          source={avatarSource(post)}
          style={{
            position: 'absolute',
            left: px(avatar.x),
            top: px(avatar.y),
            width: px(avatar.size),
            height: px(avatar.size),
            borderRadius: px(avatar.size / 2),
          }}
        />
        {post.live ? <WaveBadge /> : null}
      </Pressable>

      <Pressable
        onPress={onPressName}
        disabled={!onPressName}
        style={{
          position: 'absolute',
          left: px(name.x),
          top: px(name.y),
          right: px(AUTHOR.width - AUTHOR.follow.x + 8),
          height: px(name.height),
          justifyContent: 'center',
        }}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            {
              fontSize: px(name.size),
              lineHeight: px(name.height),
            },
          ]}
        >
          {post.author?.display_name ?? 'Guftagu user'}
        </Text>
      </Pressable>

      <BadgeStrip left={name.x} top={name.y + name.height + name.gap} />

      {trailing ? (
        <View
          style={{
            position: 'absolute',
            left: px(AUTHOR.follow.x),
            top: px(AUTHOR.follow.y),
            width: px(AUTHOR.follow.width),
            height: px(AUTHOR.follow.height),
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {trailing}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Node 77:817 — the thumbnail, its play arrow and the date/time row beneath.
 * Figma draws the thumbnail flat black, i.e. an unset image fill.
 */
export function MediaBlock({
  post,
  left,
  top,
  onPress,
}: {
  post: FeedItem;
  left: number;
  top: number;
  /** Which thumbnail was tapped, so the viewer opens on that one. */
  onPress?: (index: number) => void;
}) {
  const { px } = useDesignScale();
  const stamp = formatStamp(post.created_at, post.author?.country ?? null);
  const { columns, gap } = MEDIA.grid;
  const tile = mediaTile(left);
  const blockHeight = mediaBlockHeight(post, left);

  const thumb = (
    url: string | undefined,
    x: number,
    y: number,
    width: number,
    height: number,
    index = 0,
    key?: string,
  ) => (
    <Pressable
      key={key}
      onPress={() => onPress?.(index)}
      disabled={!onPress}
      style={{
        position: 'absolute',
        left: px(x),
        top: px(y),
        width: px(width),
        height: px(height),
        borderRadius: px(MEDIA.radius),
        backgroundColor: colors.black,
        overflow: 'hidden',
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          // An explicit size, not absoluteFill: on react-native-web a stretched
          // <Image> with only insets falls back to its intrinsic bitmap size.
          style={{ width: px(width), height: px(height) }}
        />
      ) : null}
      {(url !== undefined && isVideoUrl(url)) || post.type === 'audio' ? (
        <View style={styles.play}>
          <Play
            // The glyph keeps its share of the thumbnail it sits on.
            size={px((MEDIA.play * height) / MEDIA.height)}
            color={colors.white}
            fill={colors.white}
            strokeWidth={0}
          />
        </View>
      ) : null}
    </Pressable>
  );

  const urls = post.media_urls ?? [];

  return (
    <>
      {urls.length === 0
        ? null
        : urls.length === 1
          ? thumb(urls[0], left, top, MEDIA.width, MEDIA.height)
          : urls.map((url, index) =>
              thumb(
                url,
                left + (index % columns) * (tile + gap),
                top + Math.floor(index / columns) * (tile + gap),
                tile,
                tile,
                index,
                `${url}-${index}`,
              ),
            )}

      {/* The two labels are a row, so the 9px gap survives the wider substitute
          font rather than the date running into the time. */}
      <View
        style={{
          position: 'absolute',
          left: px(left),
          top: px(top + blockHeight + (urls.length > 0 ? MEDIA.gap : 0)),
          flexDirection: 'row',
          gap: px(MEDIA.meta.gap),
        }}
      >
        <Text
          numberOfLines={1}
          style={[styles.meta, { fontSize: px(MEDIA.meta.size), lineHeight: px(MEDIA.meta.height) }]}
        >
          {stamp.date}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.meta, { fontSize: px(MEDIA.meta.size), lineHeight: px(MEDIA.meta.height) }]}
        >
          {stamp.time}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  name: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  play: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexShrink: 0,
    fontFamily: typography.fontFamily.regular,
    color: colors.momentMeta,
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
