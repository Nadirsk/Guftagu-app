import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/chats/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { REPORT, REPORT_TYPES } from './geometry';

/**
 * Report — nodes 514:3014 (the form) and 514:3040 (its type picker). Figma
 * draws this one on a 440-wide frame, so every value goes through `q`, which
 * scales it to the 402 the rest of the app is laid out on.
 *
 * The app API has no report endpoint (only the admin moderation queue reads
 * reports), so Submit checks the form and then says it is not wired yet.
 */

export default function ReportScreen() {
  const { px } = useDesignScale();
  const q = (v: number) => px((v * 402) / REPORT.width);
  const navigation = useNavigation();
  const [type, setType] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const R = REPORT;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const pickPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!picked.canceled && picked.assets[0]) setPhoto(picked.assets[0].uri);
  };

  const submit = () => {
    if (!type) return Alert.alert('Report', 'Select a report type.');
    if (!reason.trim()) return Alert.alert('Report', 'Fill in the reason for reporting.');
    Alert.alert('Report', 'Coming soon');
  };

  const label = (text: string, y: number, color: string) => (
    <Text style={[styles.medium, { position: 'absolute', left: q(R.label.x), top: q(y), width: q(R.label.width), fontSize: q(R.label.size), lineHeight: q(26), color }]}>{text}</Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ height: q(956) }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={q(8)} style={{ position: 'absolute', left: q(R.back.x), top: q(R.back.y) }}>
          <SvgXml xml={icons.backArrow} width={q(R.back.size)} height={q(R.back.size)} />
        </Pressable>
        <Text style={[styles.medium, { position: 'absolute', left: 0, right: 0, top: q(R.title.y), textAlign: 'center', fontSize: q(R.title.size), lineHeight: q(35) }]}>Report</Text>

        {label('Select report type(Required):', R.typeLabelY, 'rgba(255,255,255,0.5)')}
        <Pressable
          onPress={() => setPicking(true)}
          style={{ position: 'absolute', left: q(R.label.x), top: q(R.type.y), width: q(R.label.width), height: q(R.type.height), borderRadius: q(R.type.radius), backgroundColor: R.field }}
        >
          <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: q(R.type.textX), top: q(20), fontSize: q(R.type.size), lineHeight: q(23), opacity: type ? 1 : 0.5 }]}>
            {type ?? 'Report Nickname'}
          </Text>
          {/* vuesax arrow-left, turned 178.91deg to point right. */}
          <View style={{ position: 'absolute', left: q(R.type.chevron.x), top: q(R.type.chevron.y), transform: [{ rotate: '178.91deg' }] }}>
            <SvgXml xml={icons.chevronLeft} width={q(R.type.chevron.size)} height={q(R.type.chevron.size)} />
          </View>
        </Pressable>

        {label('Fill the reason for reporting(Required):', R.reasonLabelY, 'rgba(255,255,255,0.47)')}
        <View style={{ position: 'absolute', left: q(R.label.x), top: q(R.reason.y), width: q(R.label.width), height: q(R.reason.height), borderRadius: q(R.type.radius), backgroundColor: R.field }}>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
            placeholder="Say Something..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            textAlignVertical="top"
            style={[styles.regular, { position: 'absolute', left: q(R.reason.textX), right: q(R.reason.textX), top: q(R.reason.textY), bottom: q(R.reason.textY), padding: 0, fontSize: q(R.reason.size) }]}
          />
        </View>

        {label('Upload a picture(Optional):', R.uploadLabelY, colors.white)}
        <Pressable
          onPress={pickPhoto}
          style={{
            position: 'absolute',
            left: q(R.label.x),
            top: q(R.upload.y),
            width: q(R.upload.width),
            height: q(R.upload.height),
            borderRadius: q(R.upload.radius),
            borderWidth: 1,
            borderColor: R.upload.border,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            gap: q(R.upload.gap),
          }}
        >
          {photo ? (
            <Image source={{ uri: photo }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <>
              <SvgXml xml={icons.camera} width={q(R.upload.camera)} height={q(R.upload.camera)} />
              <Text style={[styles.regular, { fontSize: q(R.upload.size), lineHeight: q(24), opacity: 0.5 }]}>Upload Photos</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <Pressable
        onPress={submit}
        style={{ position: 'absolute', left: q(R.label.x), width: q(R.label.width), bottom: q(R.submit.bottom), height: q(R.submit.height), borderRadius: q(R.submit.radius), backgroundColor: R.submit.color, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={[styles.medium, { fontSize: q(R.submit.size), lineHeight: q(27) }]}>Submit</Text>
      </Pressable>

      {picking ? <TypeSheet q={q} onPick={(t) => { setType(t); setPicking(false); }} onCancel={() => setPicking(false)} /> : null}
    </View>
  );
}

/** Frames 1953 + 1954 — the four types, and Cancel 3px below them. */
function TypeSheet({ q, onPick, onCancel }: { q: (v: number) => number; onPick: (t: string) => void; onCancel: () => void }) {
  const S = REPORT.sheet;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onCancel} style={StyleSheet.absoluteFill} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: q(S.cancel.height + S.cancel.gap),
          height: q(S.height),
          backgroundColor: REPORT.field,
          borderTopLeftRadius: q(S.radius.left),
          borderTopRightRadius: q(S.radius.right),
        }}
      >
        {REPORT_TYPES.map((t, i) => (
          <Pressable key={t} onPress={() => onPick(t)} style={{ position: 'absolute', left: 0, right: 0, top: q(S.itemsY + i * S.step), height: q(29), alignItems: 'center' }}>
            <Text style={[styles.regular, { fontSize: q(S.size), lineHeight: q(29) }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onCancel} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: q(S.cancel.height), backgroundColor: REPORT.field, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[styles.regular, { fontSize: q(S.size), lineHeight: q(29), color: S.cancel.color }]}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  regular: { fontFamily: typography.fontFamily.regular, color: colors.white },
  medium: { fontFamily: typography.fontFamily.medium, color: colors.white },
});
