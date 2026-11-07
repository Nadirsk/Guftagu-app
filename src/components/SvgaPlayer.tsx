import { Canvas, Group, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { loadSvga, type LoadedSvga } from '../lib/svga/load';
import { recordSvgaFrame } from '../lib/svga/render';

// Built lazily, not at module scope: on web Skia's WASM may not be loaded yet
// when this module is imported.
let _emptyPicture: SkPicture | undefined;
function getEmptyPicture(): SkPicture {
  if (!_emptyPicture) {
    const recorder = Skia.PictureRecorder();
    recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
    _emptyPicture = recorder.finishRecordingAsPicture();
  }
  return _emptyPicture;
}

type Props = {
  /** A remote `.svga`, e.g. a Store item's `animation_url`. */
  url: string;
  style?: StyleProp<ViewStyle>;
  /** Times to play before stopping; 0 loops forever. */
  loops?: number;
  onFinished?: () => void;
  /**
   * Fired once the first frame is on screen. Callers that show a still image in
   * the meantime use it to take that image away.
   */
  onFirstFrame?: () => void;
};

/**
 * Plays a `.svga` with Skia - Mehfil's player, so the Store's frames animate the
 * same way there. Each frame is recorded into a picture and handed to the canvas
 * through a shared value, so playing never re-renders React. It stops while the
 * app is in the background; a still image should sit underneath until `onFirstFrame`.
 */
export function SvgaPlayer({ url, style, loops = 0, onFinished, onFirstFrame }: Props) {
  const [movie, setMovie] = useState<LoadedSvga | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState(AppState.currentState === 'active');
  const picture = useSharedValue<SkPicture>(getEmptyPicture());
  const onFinishedRef = useRef(onFinished);
  const onFirstFrameRef = useRef(onFirstFrame);

  useEffect(() => {
    onFinishedRef.current = onFinished;
    onFirstFrameRef.current = onFirstFrame;
  }, [onFinished, onFirstFrame]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    loadSvga(url)
      .then((m) => alive && setMovie(m))
      .catch((error) => {
        console.warn('SvgaPlayer: failed to load animation', error);
        onFinishedRef.current?.();
      });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    if (!movie || !active || movie.frames === 0) return;
    let raf = 0;
    let start = -1;
    let lastIndex = -1;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const played = Math.floor(((now - start) / 1000) * movie.fps);
      if (loops > 0 && played >= loops * movie.frames) {
        picture.value = getEmptyPicture();
        onFinishedRef.current?.();
        return;
      }
      const index = played % movie.frames;
      if (index !== lastIndex) {
        const first = lastIndex < 0;
        lastIndex = index;
        picture.value = recordSvgaFrame(movie, index);
        if (first) onFirstFrameRef.current?.();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [movie, active, loops, picture]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  // Fitted like `contain`: the whole movie, centred.
  const scale = movie && movie.width > 0 && size.width > 0 ? Math.min(size.width / movie.width, size.height / movie.height) : 0;

  return (
    <View pointerEvents="none" style={style} onLayout={onLayout}>
      {movie && scale > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group
            transform={[
              { translateX: (size.width - movie.width * scale) / 2 },
              { translateY: (size.height - movie.height * scale) / 2 },
              { scale },
            ]}
          >
            <Picture picture={picture} />
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}
