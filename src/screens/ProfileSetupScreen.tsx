import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, CalendarDays, Camera, ChevronDown, Images, Lock, User } from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../components/AppAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ActionSheet from '../components/ActionSheet';
import DatePickerModal, { formatDateDMY } from '../components/DatePickerModal';
import SelectModal from '../components/SelectModal';
import { COUNTRY_OPTIONS, countryFlagEmoji } from '../constants/countryOptions';
import { GENDER_LABEL_KEYS, GENDER_OPTIONS } from '../constants/genderOptions';
import { RootStackParamList } from '../navigation/types';
import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

const background = require('../assets/profile-setup-bg.png');
const logo = require('../assets/guftagu-logo.png');

// Figma node 2:2 ("signup") — every number below is a design pixel on the
// 402x874 frame. Values under `card` and its children are offsets inside node
// 10:37, the white sheet that starts at y=231. The design positions these
// absolutely (the back arrow and the avatar overlap vertically), so the screen
// mirrors that instead of stacking them in flow.
const D = {
  background: { x: -4, y: -8, width: 425, height: 906 }, // node 10:35 "image 1"
  // Node 6:3 "Guftagu" — white Helvetica Black Oblique with a hard black shadow.
  // Exported at 4x from Figma, so the asset is already rotated -6.39deg; do not
  // rotate it again. 54.3 keeps the 787x217 export's exact aspect ratio.
  logo: { x: 107.4, y: 115.8, width: 197, height: 54.3 },
  card: { y: 182, radius: 30 }, // node 10:37
  back: { x: 16, y: 29, size: 24 }, // node 297:3290 "arrow_back"
  avatar: { x: 156, y: 41, size: 90 }, // node 9:4 "Ellipse 1"
  badge: { x: 204, y: 101, size: 42, icon: 21 }, // nodes 9:5 / 9:6 "camera"
  // The design now has all 6 fields (name, email, phone, birth date, gender,
  // country), so the form uses Figma's own y / gap / height verbatim.
  form: { x: 16, y: 170, width: 370, gap: 16 }, // node 9:16
  field: { height: 54, radius: 10 }, // nodes 9:9 / 353:2131 / 353:2133 / 9:11 / 9:24 / 297:3293
  textField: { paddingLeft: 19, paddingRight: 19, icon: 19 }, // nodes 9:9 / 9:11
  selectField: { paddingLeft: 15, paddingRight: 13, icon: 24, leadingIcon: 19 }, // nodes 9:24 / 297:3293
  confirm: { x: 18, width: 366, height: 55, radius: 42, bottomGap: 25 }, // node 9:33, top 612 in the 692px card
  fieldValueGap: 10, // between a field's leading icon/flag and its text
  fontSize: { field: 15, confirm: 16 },
};

// The circular avatar and the round crop box mean a square photo, and 0.8 keeps
// the upload small without the crop looking soft at 90px.
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

const COUNTRY_SELECT_OPTIONS = COUNTRY_OPTIONS.map((country) => ({
  value: country.code,
  label: country.name,
  leading: countryFlagEmoji(country.code),
}));

function SelectField({
  value,
  leading,
  placeholder,
  onPress,
  trailing,
  boxStyle,
  paddingLeft,
  paddingRight,
  fontSize,
  gap,
}: {
  value?: string;
  /** Shown before the value, the way the country field shows its flag. */
  leading?: ReactNode;
  placeholder: string;
  onPress?: () => void;
  trailing: ReactNode;
  boxStyle: { height: number; borderRadius: number };
  paddingLeft: number;
  paddingRight: number;
  fontSize: number;
  gap: number;
}) {
  return (
    <Pressable
      style={[styles.fieldBox, boxStyle, styles.fieldRow, { paddingLeft, paddingRight }]}
      onPress={onPress}
    >
      <View style={[styles.fieldValue, { gap }]}>
        {value ? leading : null}
        <Text
          numberOfLines={1}
          style={[styles.fieldText, { fontSize }, value ? styles.fieldTextFilled : null]}
        >
          {value ?? placeholder}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const genderOptions = useMemo(
    () =>
      GENDER_OPTIONS.map((option) => ({
        ...option,
        label: t(GENDER_LABEL_KEYS[option.value]),
      })),
    [t],
  );
  const insets = useSafeAreaInsets();
  const { px } = useDesignScale();

  // app.json asks Android for `pan`, which leaves this layout alone and slides
  // the whole window instead. That is a manifest flag though, so under `resize`
  // — Expo Go, or if the flag ever goes missing — the card shrinks and the
  // bottom-anchored Confirm lands in the middle of the form. Hiding it while the
  // keyboard is up costs nothing under `pan`, where it sits behind the keyboard
  // anyway, and keeps the form intact under `resize`.
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const { user, completeProfile, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  // Google/Facebook sign-in already seeds display_name with the provider's name
  // (UserAuthService::createUser) — OTP sign-in seeds it with guftagu_id instead, since it
  // has no name to use. That fallback isn't a name the user picked, so leave it blank for
  // them to fill in rather than prefilling what reads as a random ID.
  const [userName, setUserName] = useState(
    user?.display_name && user.display_name !== user.guftagu_id ? user.display_name : '',
  );
  // Locked (and left out of what gets saved) when signup already set it — the user can
  // only fill in whichever one their sign-in method didn't collect.
  const emailLocked = Boolean(user?.email);
  const phoneLocked = Boolean(user?.phone);
  const [email, setEmail] = useState(user?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [gender, setGender] = useState<string>();
  const [countryCode, setCountryCode] = useState<string>();
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
  const selectedGender = genderOptions.find((option) => option.value === gender);
  const GenderIcon = selectedGender?.Icon;

  // Registration finishes here: the account already exists from OTP verification,
  // this fills in the profile the backend was waiting on. Once it saves,
  // `is_profile_complete` flips and the navigator moves on to Home by itself.
  async function confirm() {
    if (saving) return;

    if (!userName.trim() || !dateOfBirth || !selectedGender) {
      Alert.alert(t('profile.almostThere'), t('profile.needDetails'));
      return;
    }

    setSaving(true);
    try {
      await completeProfile({
        display_name: userName.trim(),
        gender: selectedGender.apiValue,
        // The API takes an ISO date; the field shows DD/MM/YYYY.
        date_of_birth: dateOfBirth.toISOString().slice(0, 10),
        country: selectedCountry?.name ?? null,
        email: emailLocked ? null : email.trim() || null,
        phone: phoneLocked ? null : phoneNumber.trim() || null,
      });
    } catch (error) {
      Alert.alert(
        t('profile.couldNotSave'),
        error instanceof ApiError ? error.displayMessage : t('common.somethingWrong'),
      );
    } finally {
      setSaving(false);
    }
  }

  // A denial is permanent until the user changes it in Settings, so an alert
  // that only says "no" would be a dead end — offer the way back.
  const openSettings = (message: string) =>
    Alert.alert(t('profile.permissionNeeded'), message, [
      { text: t('profile.notNow'), style: 'cancel' },
      { text: t('profile.openSettings'), onPress: () => Linking.openSettings() },
    ]);

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      openSettings(t('profile.cameraAccess'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PHOTO_OPTIONS);
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      openSettings(t('profile.photoAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS);
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const fieldBoxStyle = {
    height: px(D.field.height),
    borderRadius: px(D.field.radius),
  };
  const fieldFontSize = px(D.fontSize.field);

  const chevron = (
    <ChevronDown size={px(D.selectField.icon)} color={colors.black} strokeWidth={2.5} />
  );

  return (
    <View style={styles.screen}>
      <Image
        source={background}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: px(D.background.x),
          top: px(D.background.y),
          width: px(D.background.width),
          height: px(D.background.height),
        }}
      />

      <Image
        source={logo}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: px(D.logo.x),
          top: px(D.logo.y),
          width: px(D.logo.width),
          height: px(D.logo.height),
        }}
      />

      <View
        style={[
          styles.card,
          {
            top: px(D.card.y),
            borderTopLeftRadius: px(D.card.radius),
            borderTopRightRadius: px(D.card.radius),
          },
        ]}
      >
        {/* Behind the form, so every field still gets its own taps: this only
            catches the blank parts of the card. With the keyboard in pan mode
            the Confirm button sits behind the keyboard, so without this there
            is nothing to tap to put the keyboard away. */}
        <Pressable
          accessible={false}
          style={StyleSheet.absoluteFill}
          onPress={Keyboard.dismiss}
        />

        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : signOut())}
          hitSlop={12}
          style={{ position: 'absolute', left: px(D.back.x), top: px(D.back.y) }}
        >
          <ArrowLeft size={px(D.back.size)} color={colors.black} strokeWidth={2} />
        </Pressable>

        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{
              position: 'absolute',
              left: px(D.avatar.x),
              top: px(D.avatar.y),
              width: px(D.avatar.size),
              height: px(D.avatar.size),
              borderRadius: px(D.avatar.size / 2),
            }}
          />
        ) : (
          // No photo yet: a neutral silhouette, not a stock picture of someone.
          <View
            style={[
              styles.avatarEmpty,
              {
                left: px(D.avatar.x),
                top: px(D.avatar.y),
                width: px(D.avatar.size),
                height: px(D.avatar.size),
                borderRadius: px(D.avatar.size / 2),
              },
            ]}
          >
            <User size={px(D.avatar.size * 0.5)} color={colors.avatarEmptyIcon} strokeWidth={1.8} />
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePicture')}
          onPress={() => setPhotoSheetVisible(true)}
          style={[
            styles.badge,
            {
              left: px(D.badge.x),
              top: px(D.badge.y),
              width: px(D.badge.size),
              height: px(D.badge.size),
              borderRadius: px(D.badge.size / 2),
            },
          ]}
        >
          <Camera size={px(D.badge.icon)} color={colors.black} strokeWidth={1.6} />
        </Pressable>

        <View
          style={{
            position: 'absolute',
            left: px(D.form.x),
            top: px(D.form.y),
            width: px(D.form.width),
            gap: px(D.form.gap),
          }}
        >
          <View style={[styles.fieldBox, fieldBoxStyle]}>
            <TextInput
              value={userName}
              onChangeText={setUserName}
              placeholder={t('profile.userName')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                { paddingHorizontal: px(D.textField.paddingLeft), fontSize: fieldFontSize },
              ]}
            />
          </View>

          {/* Locked when signup (OTP/Google) already gave us this one — e.g. a Google
              sign-in's email, or an OTP sign-in's phone. Whichever one signup *didn't*
              collect stays a normal editable field so the user can fill it in themselves
              (unverified; see setupProfile on the backend). */}
          <View
            style={[
              styles.fieldBox,
              fieldBoxStyle,
              emailLocked && styles.fieldRow,
              emailLocked && styles.lockedField,
              emailLocked
                ? { paddingLeft: px(D.textField.paddingLeft), paddingRight: px(D.textField.paddingRight) }
                : null,
            ]}
          >
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={!emailLocked}
              placeholder={t('profile.email')}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.textInput,
                emailLocked ? [styles.lockedFieldText, { flex: 1 }] : { paddingHorizontal: px(D.textField.paddingLeft) },
                { fontSize: fieldFontSize },
              ]}
            />
            {emailLocked && <Lock size={px(D.textField.icon)} color={colors.textMuted} strokeWidth={1.8} />}
          </View>

          <View
            style={[
              styles.fieldBox,
              fieldBoxStyle,
              phoneLocked && styles.fieldRow,
              phoneLocked && styles.lockedField,
              phoneLocked
                ? { paddingLeft: px(D.textField.paddingLeft), paddingRight: px(D.textField.paddingRight) }
                : null,
            ]}
          >
            <TextInput
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))}
              editable={!phoneLocked}
              placeholder={t('profile.phone')}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[
                styles.textInput,
                phoneLocked ? [styles.lockedFieldText, { flex: 1 }] : { paddingHorizontal: px(D.textField.paddingLeft) },
                { fontSize: fieldFontSize },
              ]}
            />
            {phoneLocked && <Lock size={px(D.textField.icon)} color={colors.textMuted} strokeWidth={1.8} />}
          </View>

          <SelectField
            placeholder={t('profile.dob')}
            value={dateOfBirth ? formatDateDMY(dateOfBirth) : undefined}
            onPress={() => setDateModalVisible(true)}
            boxStyle={fieldBoxStyle}
            fontSize={fieldFontSize}
            paddingLeft={px(D.textField.paddingLeft)}
            paddingRight={px(D.textField.paddingRight)}
            gap={px(D.fieldValueGap)}
            trailing={
              <CalendarDays
                size={px(D.textField.icon)}
                color={colors.textMuted}
                strokeWidth={1.8}
              />
            }
          />

          <SelectField
            placeholder={t('profile.selectGender')}
            value={gender}
            leading={
              GenderIcon ? (
                <GenderIcon size={px(D.selectField.leadingIcon)} color={colors.black} strokeWidth={1.8} />
              ) : null
            }
            onPress={() => setGenderModalVisible(true)}
            boxStyle={fieldBoxStyle}
            fontSize={fieldFontSize}
            paddingLeft={px(D.selectField.paddingLeft)}
            paddingRight={px(D.selectField.paddingRight)}
            gap={px(D.fieldValueGap)}
            trailing={chevron}
          />

          <SelectField
            placeholder={t('profile.selectCountry')}
            value={
              selectedCountry
                ? `${countryFlagEmoji(selectedCountry.code)}  ${selectedCountry.name}`
                : undefined
            }
            onPress={() => setCountryModalVisible(true)}
            boxStyle={fieldBoxStyle}
            fontSize={fieldFontSize}
            paddingLeft={px(D.selectField.paddingLeft)}
            paddingRight={px(D.selectField.paddingRight)}
            gap={px(D.fieldValueGap)}
            trailing={chevron}
          />
        </View>

        {!keyboardVisible && (
          <Pressable
            onPress={confirm}
            disabled={saving}
            style={[
              styles.confirmButton,
              saving && styles.disabled,
              {
                left: px(D.confirm.x),
                width: px(D.confirm.width),
                height: px(D.confirm.height),
                borderRadius: px(D.confirm.radius),
                // Figma pins Confirm 25px above the bottom of the 874px frame; on
                // taller devices keep that gap but never sit under the home indicator.
                bottom: Math.max(px(D.confirm.bottomGap), insets.bottom + px(12)),
              },
            ]}
          >
            <Text style={[styles.confirmButtonText, { fontSize: px(D.fontSize.confirm) }]}>
              {saving ? t('common.saving') : t('common.confirm')}
            </Text>
          </Pressable>
        )}
      </View>

      <ActionSheet
        visible={photoSheetVisible}
        title={t('profile.pictureTitle')}
        actions={[
          { key: 'camera', label: t('profile.takePhoto'), Icon: Camera, onPress: takePhoto },
          { key: 'gallery', label: t('profile.chooseGallery'), Icon: Images, onPress: pickFromGallery },
        ]}
        onClose={() => setPhotoSheetVisible(false)}
      />

      <DatePickerModal
        visible={dateModalVisible}
        title={t('profile.dobTitle')}
        value={dateOfBirth}
        onConfirm={setDateOfBirth}
        onClose={() => setDateModalVisible(false)}
      />

      <SelectModal
        visible={genderModalVisible}
        title={t('profile.selectGender')}
        options={genderOptions}
        selectedValue={gender}
        onSelect={setGender}
        onClose={() => setGenderModalVisible(false)}
      />

      <SelectModal
        visible={countryModalVisible}
        title={t('common.selectCountry')}
        options={COUNTRY_SELECT_OPTIONS}
        selectedValue={countryCode}
        searchable
        searchPlaceholder={t('common.searchCountries')}
        onSelect={setCountryCode}
        onClose={() => setCountryModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
  },
  badge: {
    position: 'absolute',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 2,
    elevation: 3,
  },
  avatarEmpty: {
    position: 'absolute',
    backgroundColor: colors.avatarEmptyFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBox: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedField: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  lockedFieldText: {
    color: colors.textMuted,
  },
  fieldValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  fieldTextFilled: {
    color: colors.black,
  },
  textInput: {
    height: '100%',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  disabled: {
    opacity: 0.5,
  },
  confirmButton: {
    position: 'absolute',
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
});
