import { type RouteProp, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { api, ApiError } from '../../api/client';
import type { RootStackParamList } from '../../navigation/types';
import { HEADER } from './geometry';
import { SettingsHeader, styles as s, useSettingsUnit } from './parts';

type Page = { type: string; title: string; content: string; version: number; published_at: string | null };

/**
 * Settings → About Us / Privacy Policy / Terms of use. Figma draws no page for these,
 * so it is the section's header over the published text the admin wrote
 * (`GET /pages/{type}`), in Hindi when the app is.
 */
export default function LegalPageScreen() {
  const u = useSettingsUnit();
  const { params } = useRoute<RouteProp<RootStackParamList, 'LegalPage'>>();
  const { i18n } = useTranslation();
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<Page>(`/pages/${params.type}?lang=${i18n.language === 'hi' ? 'hi' : 'en'}`)
      .then((p) => live && setPage(p))
      .catch((e) => live && setError(e instanceof ApiError && e.status === 404 ? 'This page is not available yet.' : 'Could not load this page.'));
    return () => {
      live = false;
    };
  }, [i18n.language, params.type]);

  const top = HEADER.back.y + HEADER.back.size + 40;
  return (
    <View style={s.screen}>
      <SettingsHeader title={params.title} />
      {page ? (
        <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: u(top), bottom: 0 }} contentContainerStyle={{ paddingHorizontal: u(21), paddingBottom: u(40) }}>
          <Text style={[s.regular, { fontSize: u(16), lineHeight: u(26), opacity: 0.8 }]}>{page.content}</Text>
        </ScrollView>
      ) : error ? (
        <Text style={[s.regular, { position: 'absolute', left: u(21), right: u(21), top: u(top + 80), textAlign: 'center', fontSize: u(16), opacity: 0.4 }]}>{error}</Text>
      ) : (
        <ActivityIndicator style={{ position: 'absolute', left: 0, right: 0, top: u(top + 80) }} color="#999" />
      )}
    </View>
  );
}
