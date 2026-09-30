import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  Image,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { isVideoUrl } from './parts';

/**
 * Full-screen media, opened by tapping a thumbnail in the feed or on Post
 * Details. A moment can carry nine files, so this is a pager: one swipe per
 * file, with "3/9" over the top of it. Everything is on black, because a photo
 * on white is a photo with a border.
 *
 * Video plays here rather than in the feed — a feed that plays six clips at
 * once is a feed that stutters. Only the page you are looking at is playing;
 * swiping away pauses it.
 */

/** The counter and the close button, in design pixels on the 402-wide frame. */
const D = { counter: { top: 18, size: 17, height: 22 }, close: { x: 16, size: 24 } } as const;

type ViewerRoute = RouteProp<RootStackParamList, 'MediaViewer'>;

type PageSize = { width: number; height: number };

function VideoPage({ url, size, active }: { url: string; size: PageSize; active: boolean }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });

  // `play`/`pause` are safe to call on every render pass; the player ignores a
  // request for the state it is already in.
  if (active) {
    player.play();
  } else {
    player.pause();
  }

  return (
    <View style={size}>
      <VideoView player={player} style={styles.page} contentFit="contain" nativeControls />
    </View>
  );
}

export default function MediaViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<ViewerRoute>();
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();

  const urls = route.params.urls;
  const [index, setIndex] = useState(Math.min(Math.max(route.params.index ?? 0, 0), urls.length - 1));
  /**
   * Measured rather than read off `Dimensions`: a page in a horizontal list has
   * no height of its own to stretch into, so each one is sized explicitly, and
   * the box is the only thing that knows how big it is.
   */
  const [size, setSize] = useState<PageSize | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size?.width || height !== size?.height) setSize({ width, height });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!size) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / size.width);
    if (next !== index) setIndex(next);
  };

  return (
    <View style={styles.screen} onLayout={onLayout}>
      {size ? (
        <FlatList
          data={urls}
          keyExtractor={(url, i) => `${url}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: size.width, offset: size.width * i, index: i })}
          onMomentumScrollEnd={onScroll}
          renderItem={({ item, index: i }) =>
            isVideoUrl(item) ? (
              <VideoPage url={item} size={size} active={i === index} />
            ) : (
              <View style={size}>
                <Image source={{ uri: item }} style={styles.page} resizeMode="contain" />
              </View>
            )
          }
        />
      ) : null}

      {/* "1/2", as the counter sits in every gallery. Hidden for a lone file,
          where it would only ever say 1/1. */}
      {urls.length > 1 ? (
        <Text
          style={[
            styles.counter,
            {
              top: insets.top + px(D.counter.top),
              fontSize: px(D.counter.size),
              lineHeight: px(D.counter.height),
            },
          ]}
        >
          {index + 1}/{urls.length}
        </Text>
      ) : null}

      {/* Android has its own back button; iOS has nothing here without this. */}
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.close, { left: px(D.close.x), top: insets.top + px(D.counter.top) }]}
      >
        <X size={px(D.close.size)} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  page: {
    width: '100%',
    height: '100%',
  },
  counter: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  close: {
    position: 'absolute',
  },
});
