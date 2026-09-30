import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ChevronDown, ChevronRight, Play, Send, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { api, ApiError, uploadFile } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Post a moment — Figma node 99:1340, opened by the Moment screen's "+".
 *
 * It has no bottom bar of its own and gets none: the bar belongs to the tab
 * shell, and this screen is pushed over it — see `src/navigation/TabShell.tsx`.
 *
 * Figma sets the header and the field's placeholder in Delight and everything
 * below them in Mona Sans Medium. Neither ships with the app, so both fall back
 * to Poppins the way the rest of the app does — Regular for the Delight text,
 * Medium for the Mona Sans text.
 */

// Every number is a design pixel on the 402x874 frame.
const D = {
  // Node 99:1359 — `flex gap-[9px] items-end` at (16, 83).
  // The title's own x=33 is the arrow's 24 plus the frame's 9 gap, so the row
  // reproduces it — and, unlike an absolutely positioned label inside a
  // content-sized parent, it cannot wrap "Post a moment" onto two lines.
  header: { x: 16, y: 83, back: 24, gap: 9, titleSize: 18, titleHeight: 23 },
  // Node 99:1467 — a centred row, `p-[10px]`, at (297, 78).
  post: {
    x: 297,
    y: 78,
    width: 89,
    height: 41,
    radius: 27,
    icon: 24,
    gap: 6,
    labelSize: 16,
    labelHeight: 23,
  },
  // Node 99:1465 — `flex-col gap-[29px] w-[370px]` at (16, 163).
  column: { x: 16, y: 163, width: 370, gap: 29 },
  field: { height: 150, radius: 12, size: 15, height_: 22 },
  counter: { gap: 6, height: 18, size: 13 },
  dropzone: {
    height: 205,
    radius: 8,
    /**
     * Node 99:1444 — a 256-wide column at (56, 80) inside the box. The camera is
     * centred in it either way, but "Upload images and videos up to 100 mb" only
     * fits 256 in Mona Sans; in Poppins it wraps, so the label spans the box's
     * inner width instead and stays centred on the same axis.
     */
    content: { x: 56, y: 80, width: 256, gap: 8, icon: 46, labelSize: 14, labelHeight: 20 },
    /**
     * Figma only draws the empty box. Once something is attached the same box
     * holds the thumbnails: a three-across grid inset from its dashed edge.
     * `border` is the dashed edge's own width, which sits inside the box and so
     * comes off the room the tiles have — leave it out and three tiles are two
     * pixels too wide between them, and the third drops onto its own line.
     */
    grid: { inset: 10, gap: 8, columns: 3, radius: 6, remove: 18, border: 1 },
  }, // node 99:1386
  audience: {
    labelSize: 16,
    labelHeight: 23,
    gap: 14, // node 99:1452
    box: { height: 50, radius: 7, textX: 21, textY: 13, size: 16, height_: 23 }, // node 99:1446
    chevron: { x: 327, y: 13, size: 24 }, // node 99:1450
  },
  topics: { height: 30, labelSize: 16, labelHeight: 23, chevron: 24 }, // node 99:1464
} as const;

/**
 * `MediaController::MAX_KB`. Figma's label (node 99:1443) says 10 mb, which is
 * roughly fifteen seconds of phone video — so the cap went up and the label
 * follows it rather than the other way round.
 */
const MAX_MB = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/** How many files one moment carries — two full rows of the grid below. */
const MAX_MEDIA = 6;

/** `Post::TYPES` — verified against backend/app/Models/Post.php. */
type Attachment = { uri: string; name: string; mime: string; kind: 'image' | 'video' };

/**
 * `Post::VISIBILITIES` — verified against backend/app/Models/Post.php. Figma
 * draws only the closed select (node 99:1446) showing "Public", so tapping it
 * steps through the three the backend accepts rather than inventing a sheet.
 */
const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'private', label: 'Private' },
] as const;

export default function PostMomentScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [body, setBody] = useState('');
  const [media, setMedia] = useState<Attachment[]>([]);
  const [visibility, setVisibility] = useState(0);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const remaining = MAX_MEDIA - media.length;

  const pick = async () => {
    if (posting || remaining <= 0) return;
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      setError('Guftagu needs access to your photos to attach them.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    });
    if (result.canceled) return;

    const picked: Attachment[] = [];
    let oversized = 0;
    for (const asset of result.assets) {
      // `fileSize` is absent on some platforms; only a known-too-big file is
      // rejected here, and the server enforces the cap either way.
      if (asset.fileSize !== undefined && asset.fileSize > MAX_BYTES) {
        oversized += 1;
        continue;
      }
      const kind = asset.type === 'video' ? 'video' : 'image';
      picked.push({
        uri: asset.uri,
        name: asset.fileName ?? `${kind}-${Date.now()}.${kind === 'video' ? 'mp4' : 'jpg'}`,
        mime: asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
        kind,
      });
    }

    if (oversized > 0) {
      Alert.alert(
        'Too large',
        oversized === 1
          ? `One file is over ${MAX_MB} MB, so it was not attached.`
          : `${oversized} files are over ${MAX_MB} MB, so they were not attached.`,
      );
    }
    setMedia((m) => [...m, ...picked].slice(0, MAX_MEDIA));
    setError(undefined);
  };

  const submit = async () => {
    // A moment needs text or media — `PostService::create` refuses neither.
    if (posting || (body.trim().length === 0 && media.length === 0)) return;
    setPosting(true);
    setError(undefined);
    setUploadProgress(media.length > 0 ? `Uploading 1/${media.length}...` : 'Posting...');
    try {
      // `posts.media_urls` stores URLs, so each file becomes one first via
      // `POST /media`, then the whole set goes up with the post.
      const urls: string[] = [];
      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        setUploadProgress(`Uploading ${i + 1}/${media.length}...`);
        try {
          const uploaded = await uploadFile<{ url: string }>('/media', item, token);
          urls.push(uploaded.url);
        } catch (e) {
          // `fileSize` is missing on some platforms, so the server is often
          // the first to know a file is too big. Say which one, or the message
          // is advice about a file the user cannot identify.
          //
          // Rebuilt without `details` on purpose: `displayMessage` prefers the
          // raw field error, which would drop the name again.
          throw e instanceof ApiError
            ? new ApiError('MEDIA_UPLOAD_FAILED', `${item.name}: ${e.displayMessage}`, e.status)
            : e;
        }
      }

      setUploadProgress('Publishing...');

      // `type` is one column for a set that can mix the two, so it records the
      // heaviest kind present — see the note on `Post::TYPES`.
      const type = media.some((m) => m.kind === 'video')
        ? 'video'
        : media.length > 0
          ? 'image'
          : 'text';

      await api('/posts', {
        method: 'POST',
        body: {
          type,
          body: body.trim(),
          media_urls: urls,
          visibility: VISIBILITIES[visibility].value,
        },
        token,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Could not post that right now.');
    } finally {
      setPosting(false);
      setUploadProgress(null);
    }
  };

  const { column, field, dropzone, audience, topics, counter } = D;
  const { inset, gap, columns, border } = dropzone.grid;
  // Three across, inside the dashed edge, sharing the gaps between them.
  const tileSize =
    (column.width - border * 2 - inset * 2 - gap * (columns - 1)) / columns;
  const mediaRows = Math.ceil(media.length / columns);
  /**
   * Figma's 205 is the height of the empty box. A second row of thumbnails does
   * not fit in it, so the box grows to hold what is in it and the rest of the
   * column follows — `audienceTop` is measured off this, not off the constant.
   */
  const dropzoneHeight = Math.max(
    dropzone.height,
    mediaRows > 0 ? border * 2 + inset * 2 + mediaRows * tileSize + (mediaRows - 1) * gap : 0,
  );
  // The description field is 150-tall, with 0/300 counter right below it.
  const dropzoneTop = field.height + counter.gap + counter.height + 16;
  const audienceTop = dropzoneTop + dropzoneHeight + column.gap;
  const audienceHeight = audience.labelHeight + audience.gap + audience.box.height;
  const topicsTop = audienceTop + audienceHeight + column.gap;
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);
  const headerY = topInset + 8;
  const topShift = D.header.y - headerY;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ height: px(column.y + topicsTop + topics.height + 40 - topShift) }}
      >
        <View style={{ position: 'relative', top: -px(topShift), height: px(column.y + topicsTop + topics.height + 40) }}>
          {/* Node 99:1359 */}
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[styles.header, { left: px(D.header.x), top: px(D.header.y), gap: px(D.header.gap) }]}
          >
          <ArrowLeft size={px(D.header.back)} color={colors.black} />
          <Text
            numberOfLines={1}
            style={[
              styles.headerTitle,
              {
                fontSize: px(D.header.titleSize),
                lineHeight: px(D.header.titleHeight),
              },
            ]}
          >
            Post a moment
          </Text>
        </Pressable>

        {/* Node 99:1467 */}
        <Pressable
          onPress={submit}
          disabled={posting || (body.trim().length === 0 && media.length === 0)}
          style={[
            styles.postButton,
            {
              left: px(D.post.x),
              top: px(D.post.y),
              width: px(D.post.width),
              height: px(D.post.height),
              borderRadius: px(D.post.radius),
              gap: px(D.post.gap),
              // Figma draws one state, so the pill keeps its look and an empty
              // moment is simply not sent; only an in-flight post dims it.
              opacity: posting ? 0.7 : (body.trim().length === 0 && media.length === 0 ? 0.45 : 1),
            },
          ]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Send size={px(D.post.icon)} color={colors.white} strokeWidth={2} />
              <Text
                style={[
                  styles.postLabel,
                  { fontSize: px(D.post.labelSize), lineHeight: px(D.post.labelHeight) },
                ]}
              >
                Post
              </Text>
            </>
          )}
        </Pressable>

        {/* Long text description box */}
        <View
          style={[
            styles.field,
            {
              left: px(column.x),
              top: px(column.y),
              width: px(column.width),
              height: px(field.height),
              borderRadius: px(field.radius),
            },
          ]}
        >
          <TextInput
            value={body}
            onChangeText={(text) => {
              if (text.length <= 300) setBody(text);
            }}
            maxLength={300}
            multiline
            placeholder="Say Something.."
            placeholderTextColor={colors.postPlaceholder}
            style={[
              styles.fieldInput,
              {
                left: px(16),
                right: px(16),
                top: px(14),
                bottom: px(14),
                fontSize: px(field.size),
                lineHeight: px(field.height_),
              },
            ]}
          />
        </View>

        {/* 0/300 character counter */}
        <Text
          style={[
            styles.charCount,
            {
              left: px(column.x),
              top: px(column.y + field.height + counter.gap),
              width: px(column.width),
              fontSize: px(counter.size),
              lineHeight: px(counter.height),
            },
          ]}
        >
          {body.length}/300
        </Text>

        {/* Node 99:1386 — the dashed drop zone, empty or holding what is attached. */}
        <Pressable
          onPress={pick}
          style={[
            styles.dropzone,
            {
              left: px(column.x),
              top: px(column.y + dropzoneTop),
              width: px(column.width),
              height: px(dropzoneHeight),
              borderRadius: px(dropzone.radius),
            },
          ]}
        >
          {media.length === 0 ? (
            <View
              style={{
                position: 'absolute',
                top: px(dropzone.content.y),
                left: px(dropzone.content.x - (column.width - dropzone.content.width) / 2),
                right: px(dropzone.content.x - (column.width - dropzone.content.width) / 2),
                alignItems: 'center',
                gap: px(dropzone.content.gap),
              }}
            >
              <SvgXml
                xml={icons.momentCamera}
                width={px(dropzone.content.icon)}
                height={px(dropzone.content.icon)}
              />
              <Text
                style={[
                  styles.dropzoneLabel,
                  {
                    fontSize: px(dropzone.content.labelSize),
                    lineHeight: px(dropzone.content.labelHeight),
                  },
                ]}
              >
                Upload images and videos up to {MAX_MB} mb
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.grid,
              ]}
            >
              {media.map((item, index) => (
                <View
                  key={`${item.uri}-${index}`}
                  // Placed, not wrapped: a row that wraps decides for itself how
                  // many fit, and rounding is enough to make it decide two.
                  style={{
                    position: 'absolute',
                    left: px(inset + (index % columns) * (tileSize + gap)),
                    top: px(inset + Math.floor(index / columns) * (tileSize + gap)),
                    width: px(tileSize),
                    height: px(tileSize),
                  }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={{
                      width: px(tileSize),
                      height: px(tileSize),
                      borderRadius: px(dropzone.grid.radius),
                      backgroundColor: colors.black,
                    }}
                  />
                  {item.kind === 'video' ? (
                    <View style={styles.tileBadge} pointerEvents="none">
                      <Play size={px(14)} color={colors.white} fill={colors.white} strokeWidth={0} />
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => setMedia((m) => m.filter((_, i) => i !== index))}
                    hitSlop={8}
                    style={[
                      styles.tileRemove,
                      {
                        width: px(dropzone.grid.remove),
                        height: px(dropzone.grid.remove),
                        borderRadius: px(dropzone.grid.remove / 2),
                      },
                    ]}
                  >
                    <X size={px(12)} color={colors.white} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Node 99:1452 */}
        <Text
          style={[
            styles.sectionLabel,
            {
              left: px(column.x),
              top: px(column.y + audienceTop),
              width: px(column.width),
              fontSize: px(audience.labelSize),
              lineHeight: px(audience.labelHeight),
            },
          ]}
        >
          Choose Audience
        </Text>
        <Pressable
          onPress={() => setVisibility((v) => (v + 1) % VISIBILITIES.length)}
          style={[
            styles.audience,
            {
              left: px(column.x),
              top: px(column.y + audienceTop + audience.labelHeight + audience.gap),
              width: px(column.width),
              height: px(audience.box.height),
              borderRadius: px(audience.box.radius),
            },
          ]}
        >
          <Text
            style={[
              styles.audienceValue,
              {
                left: px(audience.box.textX),
                top: px(audience.box.textY),
                fontSize: px(audience.box.size),
                lineHeight: px(audience.box.height_),
              },
            ]}
          >
            {VISIBILITIES[visibility].label}
          </Text>
          <View
            style={{
              position: 'absolute',
              left: px(audience.chevron.x),
              top: px(audience.chevron.y),
            }}
          >
            <ChevronDown size={px(audience.chevron.size)} color={colors.black} />
          </View>
        </Pressable>

        {/* Node 99:1464 — Figma gives the chevron no destination yet, so the row
            is drawn but inert. */}
        <View
          style={[
            styles.topics,
            {
              left: px(column.x),
              top: px(column.y + topicsTop),
              width: px(column.width),
              height: px(topics.height),
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.rowLabel,
              { fontSize: px(topics.labelSize), lineHeight: px(topics.labelHeight) },
            ]}
          >
            Add Topics
          </Text>
          <ChevronRight size={px(topics.chevron)} color={colors.black} />
        </View>

        {error ? (
          <Text
            style={[
              styles.error,
              {
                left: px(column.x),
                top: px(column.y + topicsTop + topics.height + 12),
                width: px(column.width),
                fontSize: px(14),
              },
            ]}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </ScrollView>

    {posting ? (
      <View
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: 'rgba(0,0,0,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}
      >
        <View
          style={{
            backgroundColor: colors.white,
            paddingVertical: 20,
            paddingHorizontal: 28,
            borderRadius: 16,
            alignItems: 'center',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <ActivityIndicator size="large" color={colors.postButton} />
          <Text
            style={{
              fontFamily: typography.fontFamily.medium,
              fontSize: 15,
              color: colors.black,
            }}
          >
            {uploadProgress ?? 'Posting moment...'}
          </Text>
        </View>
      </View>
    ) : null}
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
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  postButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.postButton,
  },
  postLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  field: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.postFieldBorder,
    backgroundColor: '#FAFAFA',
  },
  fieldInput: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    padding: 0,
    textAlignVertical: 'top',
  },
  charCount: {
    position: 'absolute',
    textAlign: 'right',
    fontFamily: typography.fontFamily.regular,
    color: colors.momentMeta,
  },
  dropzone: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.postDropzoneBorder,
  },
  dropzoneLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.postDropzoneLabel,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
  },
  tileRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tileBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    opacity: 0.9,
  },
  sectionLabel: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  audience: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.postAudienceBorder,
  },
  audienceValue: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  topics: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  error: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});
