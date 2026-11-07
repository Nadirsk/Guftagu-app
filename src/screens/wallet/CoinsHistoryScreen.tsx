import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as settingsIcons from '../../assets/settings/icons';
import * as icons from '../../assets/wallet/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Coins history (Figma 211:7265, 402 x 874): the "Details" page behind the Wallet's
 * clock icon. Consume / Income switch the list, the date and "All" filter sit under
 * them. Figma draws only the empty state — no coin transactions are served yet.
 */

const EMPTY = require('../../assets/wallet/history-empty.png');
const FILTER_BLUE = '#00B2FF'; // the "All" pill (211:7279)
const TABS = ['Consume Details', 'Income Details'] as const;
// The opened "All" panel (214:1223): chip rows of 119 / 91 / 91 and 119 / 91, 10 apart.
const FILTER_ROWS = [
  [['Lucky Gift', 119], ['Gift', 91], ['Game', 91]],
  [['Red Packet', 119], ['Mall', 91]],
] as const;

export default function CoinsHistoryScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Consume Details');
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(false);

  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });

  return (
    <View style={styles.screen}>
      {/* Details + arrow-left-normal */}
      <Text style={[at(170, 62), { fontFamily: typography.fontFamily.medium, fontSize: px(20), lineHeight: px(26), color: colors.black }]}>Details</Text>
      <Pressable onPress={() => navigation.goBack()} hitSlop={px(10)} accessibilityLabel="Back" style={[at(15, 58), { width: px(34), height: px(34) }]}>
        <SvgXml xml={settingsIcons.arrowLeft} width={px(34)} height={px(34)} />
      </Pressable>

      {/* Frame 1597881322 — Consume Details / Income Details. */}
      <View style={[at(15, 144), { flexDirection: 'row', alignItems: 'center', gap: px(15) }]}>
        {TABS.map((name) => (
          <Pressable key={name} onPress={() => setTab(name)}>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(16), lineHeight: px(19), color: colors.black, opacity: tab === name ? 1 : 0.45 }}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Frame 1597881323 — the date and the "All" filter. */}
      <View style={[at(15, 197), { width: px(372), height: px(43) }]}>
        <View style={{ position: 'absolute', left: 0, top: px(9.5), flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(15), lineHeight: px(23), color: colors.black, marginRight: px(13 - 4) }}>2025-02-15</Text>
          <SvgXml xml={icons.calendarDays} width={px(24)} height={px(24)} />
          <SvgXml xml={settingsIcons.chevronForward} width={px(24)} height={px(24)} style={{ transform: [{ rotate: '90deg' }] }} />
        </View>
        <Pressable onPress={() => setOpen((o) => !o)} style={{ position: 'absolute', left: px(289), top: 0, width: px(83), height: px(43), borderRadius: px(55), backgroundColor: FILTER_BLUE, overflow: 'hidden' }}>
          <Text style={[at(18, 12), { fontFamily: typography.fontFamily.medium, fontSize: px(15), lineHeight: px(19), color: colors.white }]}>{filter}</Text>
          <SvgXml xml={icons.chevronDownWhite} width={px(24)} height={px(24)} style={{ position: 'absolute', left: px(41), top: px(12), transform: open ? [{ rotate: '180deg' }] : [] }} />
        </Pressable>
      </View>

      {/* Frame 8978 — "No data temporarily...". */}
      <Image source={EMPTY} resizeMode="cover" style={[at(58, 364), { width: px(287), height: px(287) }]} />
      <Text style={[at(58, 626), { width: px(287), textAlign: 'center', fontFamily: typography.fontFamily.regular, fontSize: px(20), lineHeight: px(25), color: colors.black, opacity: 0.4 }]}>
        No data temporarily...
      </Text>

      {/* Frame 1597881324 — the filter panel. */}
      {open && (
        <View style={[at(15, 257), styles.panel, { width: px(372), height: px(174), borderRadius: px(13), shadowOffset: { width: 0, height: px(8) }, shadowRadius: px(5.9) }]}>
          {FILTER_ROWS.map((row, r) => (
            <View key={r} style={[at(16, r === 0 ? 29 : 86), { flexDirection: 'row', gap: px(10) }]}>
              {row.map(([name, width]) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    setFilter(name);
                    setOpen(false);
                  }}
                  style={{ width: px(width), height: px(42), borderRadius: px(22), borderWidth: 1, borderColor: 'rgba(0,0,0,0.29)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.regular, fontSize: px(14), lineHeight: px(17), color: colors.black }}>{name}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  panel: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.31)',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    elevation: 6,
  },
});
