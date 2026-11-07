import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ApiError, uploadFile } from '../../api/client';
import * as icons from '../../assets/settings/icons';
import { useAuth } from '../../auth/AuthContext';
import DatePickerModal from '../../components/DatePickerModal';
import SelectModal from '../../components/SelectModal';
import { GENDER_LABEL_KEYS, GENDER_OPTIONS, genderOptionFor } from '../../constants/genderOptions';
import { colors } from '../../theme/tokens';
import { ACCOUNT } from './geometry';
import { Chevron, Rule, SettingsHeader, styles as s, useSettingsUnit } from './parts';

const AVATAR = require('../../assets/avatar-placeholder.png');

/** `YYYY-MM-DD` → Figma's `10/05/2002` (DD/MM/YYYY). */
const showDate = (iso: string | null) => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const adultUntil = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

/**
 * Settings → Account (Figma 602:4597). The photo's badge picks a new picture; Gender,
 * Nickname and Birthdate edit in place — Gender with sign-up's own choices. Figma draws
 * Gender without a chevron; it carries one here, like the other editable rows.
 * Every change is saved through `PATCH /profile` and shows everywhere at once.
 */
export default function AccountScreen() {
  const u = useSettingsUnit();
  const { user, token, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'photo' | 'name' | 'date' | 'gender' | null>(null);
  const [choosingGender, setChoosingGender] = useState(false);
  const genderOptions = useMemo(() => GENDER_OPTIONS.map((o) => ({ ...o, label: t(GENDER_LABEL_KEYS[o.value]) })), [t]);
  const savedGender = genderOptionFor(user?.gender);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [dating, setDating] = useState(false);

  const save = async (what: 'photo' | 'name' | 'date' | 'gender', fields: Parameters<typeof updateProfile>[0]) => {
    setBusy(what);
    try {
      await updateProfile(fields);
      return true;
    } catch (e) {
      Alert.alert('Account', e instanceof ApiError ? e.displayMessage : 'Could not save that change.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setBusy('photo');
    try {
      const { url } = await uploadFile<{ url: string }>('/media', { uri: a.uri, mime: a.mimeType ?? 'image/jpeg' }, token);
      await save('photo', { avatar_url: url });
    } catch (e) {
      setBusy(null);
      Alert.alert('Account', e instanceof ApiError ? e.displayMessage : 'Could not upload the picture.');
    }
  };

  const A = ACCOUNT;
  const L = A.list;
  const row = (r: { top: number; inset: number; width: number }) => ({
    position: 'absolute' as const,
    left: u(L.x + r.inset),
    top: u(L.y + r.top),
    width: u(r.width),
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
  });
  const label = [s.medium, { fontSize: u(L.size), lineHeight: u(L.line) }];
  const value = [s.regular, { fontSize: u(L.size), lineHeight: u(L.line), opacity: L.valueOpacity }];
  const gender = savedGender ? t(GENDER_LABEL_KEYS[savedGender.value]) : '';
  const touch = (top: number) => ({ position: 'absolute' as const, left: 0, right: 0, top: u(L.y + top - 20), height: u(A.ruleBelow + 20) });

  return (
    <View style={s.screen}>
      <SettingsHeader title="Account" />

      {/* Ellipse 1998 + Ellipse 1999 + edit */}
      <Pressable onPress={changePhoto} disabled={!!busy} accessibilityLabel="Change photo" style={{ position: 'absolute', left: u(A.avatar.centerX - A.avatar.size / 2), top: u(A.avatar.y), width: u(A.avatar.size), height: u(A.avatar.size) }}>
        <Image source={user?.avatar_url ? { uri: user.avatar_url } : AVATAR} style={{ width: u(A.avatar.size), height: u(A.avatar.size), borderRadius: u(A.avatar.size / 2) }} />
        {busy === 'photo' ? (
          <View style={[s.center, { position: 'absolute', inset: 0, borderRadius: u(A.avatar.size / 2), backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <ActivityIndicator color={colors.white} />
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={changePhoto}
        disabled={!!busy}
        accessibilityLabel="Edit photo"
        hitSlop={u(6)}
        style={{ position: 'absolute', left: u(A.badge.x - (A.badge.box - A.badge.size) / 2), top: u(A.badge.y - (A.badge.box - A.badge.size) / 2), width: u(A.badge.box), height: u(A.badge.box) }}
      >
        <SvgXml xml={icons.editBadge} width={u(A.badge.box)} height={u(A.badge.box)} />
        <View style={{ position: 'absolute', left: u(A.edit.x - A.badge.x + (A.badge.box - A.badge.size) / 2), top: u(A.edit.y - A.badge.y + (A.badge.box - A.badge.size) / 2) }}>
          <SvgXml xml={icons.edit} width={u(A.edit.size)} height={u(A.edit.size)} />
        </View>
      </Pressable>

      <Text style={[s.medium, { position: 'absolute', left: u(A.section.centerX - 70), width: u(140), textAlign: 'center', top: u(A.section.y), fontSize: u(A.section.size), lineHeight: u(A.section.line), opacity: A.section.opacity }]}>
        Personal info
      </Text>

      {/* Gender — the same four choices as sign-up. */}
      <Pressable onPress={() => setChoosingGender(true)} style={touch(A.gender.top)} accessibilityLabel="Edit gender" />
      <View pointerEvents="none" style={row(A.gender)}>
        <Text style={label}>Gender</Text>
        <View style={[s.row, { gap: u(A.gender.chevronGap), alignItems: 'flex-start' }]}>
          {busy === 'gender' ? <ActivityIndicator size="small" color="#999" /> : <Text style={value}>{gender}</Text>}
          <Chevron />
        </View>
      </View>
      <Rule x={L.x} y={L.y + A.gender.top + A.ruleBelow} width={L.width} />

      <Pressable
        onPress={() => {
          setName(user?.display_name ?? '');
          setNaming(true);
        }}
        style={touch(A.nickname.top)}
        accessibilityLabel="Edit nickname"
      />
      <View pointerEvents="none" style={row(A.nickname)}>
        <Text style={label}>Nickname</Text>
        <View style={[s.row, { gap: u(A.nickname.chevronGap), alignItems: 'flex-start' }]}>
          <Text numberOfLines={1} style={[value, { maxWidth: u(220) }]}>{user?.display_name ?? ''}</Text>
          <Chevron />
        </View>
      </View>
      <Rule x={L.x} y={L.y + A.nickname.top + A.ruleBelow} width={L.width} />

      <Pressable onPress={() => setDating(true)} style={touch(A.birthdate.top)} accessibilityLabel="Edit birthdate" />
      <View pointerEvents="none" style={row(A.birthdate)}>
        <Text style={label}>Birthdate</Text>
        <View style={[s.row, { gap: u(A.birthdate.chevronGap), alignItems: 'flex-start' }]}>
          {busy === 'date' ? <ActivityIndicator size="small" color="#999" /> : <Text style={value}>{showDate(user?.date_of_birth ?? null)}</Text>}
          <Chevron />
        </View>
      </View>
      <Rule x={L.x} y={L.y + A.birthdate.top + A.ruleBelow} width={L.width} />

      <DatePickerModal
        visible={dating}
        title="Birthdate"
        value={user?.date_of_birth ? new Date(`${user.date_of_birth.slice(0, 10)}T00:00:00`) : undefined}
        maximumDate={adultUntil()}
        onClose={() => setDating(false)}
        onConfirm={(d) => {
          setDating(false);
          save('date', { date_of_birth: isoDate(d) });
        }}
      />

      <SelectModal
        visible={choosingGender}
        title={t('profile.selectGender')}
        options={genderOptions}
        selectedValue={savedGender?.value}
        onSelect={(choice) => {
          setChoosingGender(false);
          const picked = GENDER_OPTIONS.find((o) => o.value === choice);
          if (picked && picked.apiValue !== user?.gender) save('gender', { gender: picked.apiValue });
        }}
        onClose={() => setChoosingGender(false)}
      />

      {/* Nickname editor — not drawn in Figma; a plain sheet in the page's own type. */}
      <Modal visible={naming} transparent animationType="fade" onRequestClose={() => setNaming(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.center, { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <View style={{ width: u(380), borderRadius: u(16), backgroundColor: colors.white, padding: u(20), gap: u(16) }}>
            <Text style={[s.medium, { fontSize: u(18), lineHeight: u(23) }]}>Nickname</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={50}
              placeholder="Your nickname"
              placeholderTextColor="rgba(0,0,0,0.3)"
              style={[s.regular, { fontSize: u(16), height: u(48), borderRadius: u(11), paddingHorizontal: u(14), backgroundColor: 'rgba(0,0,0,0.05)' }]}
            />
            <View style={[s.row, { justifyContent: 'flex-end', gap: u(10) }]}>
              <Pressable onPress={() => setNaming(false)} style={[s.center, { height: u(44), paddingHorizontal: u(18) }]}>
                <Text style={[s.medium, { fontSize: u(16), opacity: 0.5 }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!name.trim() || busy === 'name'}
                onPress={async () => {
                  if (await save('name', { display_name: name.trim() })) setNaming(false);
                }}
                style={[s.center, { height: u(44), paddingHorizontal: u(22), borderRadius: u(11), backgroundColor: '#000000', opacity: name.trim() ? 1 : 0.4 }]}
              >
                {busy === 'name' ? <ActivityIndicator color={colors.white} /> : <Text style={[s.medium, { fontSize: u(16), color: colors.white }]}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
