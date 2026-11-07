import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as blindIcons from '../../assets/blind/icons';
import * as walletIcons from '../../assets/wallet/icons';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Create Blind Date Room (Figma 2015:8837, 402 x 874): a cover, a title and an announcement.
 * The server has no blind-date flow yet, so Confirm opens the room locally and spends nothing.
 */

const ORANGE = '#DE4200'; // the Confirm button
const DASH_BLUE = '#009DFF'; // the cover box's dashed outline
const FIELD_BORDER = 'rgba(0,0,0,0.29)';
const LINE = 1.28;

export default function BlindDateCreateScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cover, setCover] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });
  const label = (size: number, weight: 'regular' | 'medium', extra = {}) => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: px(size),
    lineHeight: px(Math.round(size * LINE)),
    color: colors.black,
    ...extra,
  });

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    // "Upload images up to 10 mb"
    if (a.fileSize && a.fileSize > 10 * 1024 * 1024) {
      Alert.alert('Room Cover', 'That picture is larger than 10 MB.');
      return;
    }
    setCover(a.uri);
  };

  const field = (top: number, name: string, placeholder: string, value: string, onChange: (v: string) => void) => (
    <>
      <Text style={[at(16, top), label(16, 'medium')]}>{name}</Text>
      <View style={[at(16, top + 29), { width: px(370), height: px(51), borderRadius: px(9), borderWidth: 1, borderColor: FIELD_BORDER, overflow: 'hidden' }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(0,0,0,0.34)"
          style={{ flex: 1, paddingHorizontal: px(17), paddingVertical: 0, fontFamily: typography.fontFamily.regular, fontSize: px(17), color: colors.black }}
        />
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* Frame 1597881208 — arrow_back + Create Room. */}
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} style={[at(16, 83), { flexDirection: 'row', alignItems: 'flex-end', gap: px(9) }]}>
        <SvgXml xml={walletIcons.arrowBack} width={px(24)} height={px(24)} />
        <Text style={label(18, 'regular')}>Create Room</Text>
      </Pressable>

      {/* Room Cover */}
      <Text style={[at(16, 149), label(16, 'medium')]}>Room Cover</Text>
      <Pressable
        onPress={pickCover}
        style={[at(16, 193), { width: px(370), height: px(166), borderRadius: px(8), borderWidth: 1, borderColor: DASH_BLUE, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}
      >
        {cover ? (
          <Image source={{ uri: cover }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={{ alignItems: 'center', gap: px(8) }}>
            <SvgXml xml={blindIcons.camera} width={px(46)} height={px(46)} />
            <Text style={label(14, 'medium', { opacity: 0.3, textAlign: 'center' })}>Upload images  up to 10 mb</Text>
          </View>
        )}
      </Pressable>

      {field(391, 'Room Title', 'Enter Title', title, setTitle)}
      {field(496, 'Room Announcement', 'Enter announcement', announcement, setAnnouncement)}

      {/* Frame 1597881230 — Confirm 30 + gem. */}
      <Pressable
        onPress={() => navigation.navigate('BlindDateRoom', { title: title.trim() || undefined, cover: cover ?? undefined })}
        style={[at(16, 779), { width: px(370), height: px(55), borderRadius: px(27), backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(5) }]}
      >
        <Text style={label(16, 'medium', { color: colors.white })}>Confirm 30</Text>
        <View style={{ width: px(33), height: px(28), overflow: 'hidden' }}>
          <Image
            source={require('../../assets/blind/gem.png')}
            resizeMode="stretch"
            style={{ position: 'absolute', left: px(-0.2381 * 33), top: px(-0.3778 * 28), width: px(1.4762 * 33), height: px(1.7222 * 28) }}
          />
        </View>
      </Pressable>
      <Text style={[at(79, 851), label(16, 'medium', { opacity: 0.3 })]}>You need to spend 30 diamonds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
