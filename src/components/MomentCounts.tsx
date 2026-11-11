import { Heart, MessageCircle } from 'lucide-react-native';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useDesignScale } from '../theme/layout';
import { typography } from '../theme/tokens';

/**
 * The like and comment marks of a moment — one design wherever a moment is listed (somebody's profile,
 * my own profile, the Moment tab), matching Post Details: an outlined heart that fills orange once liked,
 * and a speech bubble, each followed by its count.
 */
const INK = '#6B6B73';
const ACCENT = '#D13D00';

export function MomentCounts({
  likes,
  comments,
  liked = false,
  size = 20,
  gap = 16,
  onLike,
  onComment,
  style,
}: {
  likes: number;
  comments: number;
  liked?: boolean;
  /** Icon size in design px. */
  size?: number;
  gap?: number;
  onLike?: () => void;
  onComment?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { px } = useDesignScale();
  const label: TextStyle = { fontFamily: typography.fontFamily.regular, fontSize: px(Math.max(12, size * 0.65)) };

  const comment = (
    <>
      <MessageCircle size={px(size)} color={INK} />
      <Text style={[label, { color: INK }]}>{comments}</Text>
    </>
  );
  const like = (
    <>
      <Heart size={px(size)} color={liked ? ACCENT : INK} fill={liked ? ACCENT : 'transparent'} />
      <Text style={[label, { color: liked ? ACCENT : INK }]}>{likes}</Text>
    </>
  );
  const cell = { flexDirection: 'row', alignItems: 'center', gap: px(5) } as const;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: px(gap) }, style]}>
      {onComment ? (
        <Pressable onPress={onComment} hitSlop={8} accessibilityLabel="Comments" style={cell}>{comment}</Pressable>
      ) : (
        <View style={cell}>{comment}</View>
      )}
      {onLike ? (
        <Pressable onPress={onLike} hitSlop={8} accessibilityLabel={liked ? 'Unlike' : 'Like'} style={cell}>{like}</Pressable>
      ) : (
        <View style={cell}>{like}</View>
      )}
    </View>
  );
}
