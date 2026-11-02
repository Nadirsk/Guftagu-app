import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import { useDesignScale } from '../../theme/layout';
import { WHEEL } from './geometry';

/**
 * Lucky Wheel — section 575:3421. The Lucky Wheel button opens the sheet
 * (575:3598); Record opens Roulette Records (575:3818).
 *
 * The server has no wheel yet — nothing to spin against, charge, or list — so
 * the spin buttons and Recharge hand back to the room (`onSpin`, `onRecharge`)
 * and the records list is always the empty state Figma draws.
 */

const art = {
  stage: require('../../assets/room/wheel/stage.jpg'),
  tab: require('../../assets/room/wheel/tab.png'),
  tag: require('../../assets/room/wheel/record-tag.png'),
  pedestal: require('../../assets/room/wheel/pedestal.png'),
  wheel: require('../../assets/room/wheel/wheel.png'),
  coins: require('../../assets/room/wheel/coins.png'),
  spin: require('../../assets/room/wheel/spin-button.png'),
  recharge: require('../../assets/room/wheel/recharge.png'),
  panel: require('../../assets/room/wheel/records-panel.png'),
  logo: require('../../assets/room/wheel/logo.png'),
  close: require('../../assets/room/wheel/close.png'),
};

/** Ellipse 75 (575:3827), the close button's ring. */
const closeRing = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="Ellipse 75" d="M50.5 26C50.5 39.531 39.531 50.5 26 50.5C12.469 50.5 1.5 39.531 1.5 26C1.5 12.469 12.469 1.5 26 1.5C39.531 1.5 50.5 12.469 50.5 26Z" stroke-width="3" stroke="white"/>
</svg>`;

type Mode = (typeof WHEEL.tabs)[number]['key'];

export function LuckyWheelSheet({ onClose, onSpin, onRecharge }: { onClose: () => void; onSpin: (mode: Mode, times: number) => void; onRecharge: () => void }) {
  const { px } = useDesignScale();
  const abs = useBox();
  const [mode, setMode] = useState<Mode>('classic');
  const [records, setRecords] = useState(false);
  const W = WHEEL;
  const title = W.tabs.find((t) => t.key === mode)?.label ?? 'Classic';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: px(W.height),
          overflow: 'hidden',
          borderTopLeftRadius: px(W.radius),
          borderTopRightRadius: px(W.radius),
          backgroundColor: '#000',
        }}
      >
        <Img source={art.stage} box={{ x: W.stage.x, y: W.stage.y, w: W.stage.width, h: W.stage.height }} resizeMode="cover" />
        <Label cx={W.title.centerX} y={W.title.y} size={W.title.size} lineHeight={W.title.size * 1.5} weight="medium" width={200}>
          {title}
        </Label>

        {W.tabs.map((t) => (
          <Pressable key={t.key} onPress={() => setMode(t.key)} style={abs({ x: t.x, y: W.tab.y, w: 114, h: W.tab.height })}>
            <Img source={art.tab} box={{ x: 0, y: 0, w: W.tab.width, h: W.tab.height }} resizeMode="cover" />
            <Label cx={57} y={W.tab.labelY - W.tab.y} size={W.tab.size} lineHeight={W.tab.size * 1.5} weight="medium" width={100}>
              {t.label}
            </Label>
          </Pressable>
        ))}

        <Pressable onPress={() => setRecords(true)} style={abs(W.record.box)}>
          <Cropped source={art.tag} box={{ ...W.record.box, x: 0, y: 0 }} crop={W.record.crop} />
          <Label x={W.record.labelX - W.record.box.x} y={W.record.labelY - W.record.box.y} size={W.record.size} lineHeight={W.record.size * 1.5} weight="medium" width={60}>
            Record
          </Label>
        </Pressable>

        <Cropped source={art.pedestal} box={W.pedestal.box} crop={W.pedestal.crop} />
        <Cropped source={art.wheel} box={W.wheel.box} crop={W.wheel.crop} />
        {/* The GO hub in the middle of the bitmap spins once. */}
        <Pressable onPress={() => onSpin(mode, 1)} style={abs({ x: 176, y: 292, w: 62, h: 62 })} />
        <Cropped source={art.coins} box={W.coins.box} crop={W.coins.crop} />

        {W.spins.map((s) => (
          <Pressable key={s.times} onPress={() => onSpin(mode, s.times)} style={abs(s.box)}>
            {[0, 1, 2].map((i) => (
              <Cropped key={i} source={art.spin} box={{ ...s.box, x: 0, y: 0 }} crop={W.spinCrop} />
            ))}
            <Label cx={s.centerX - s.box.x} y={W.spinLabel.y - s.box.y} size={W.spinLabel.size} lineHeight={W.spinLabel.size * 1.5} weight="medium" width={120} lines={2}>
              {`${s.times} Time\n(Coins : ${s.coins})`}
            </Label>
          </Pressable>
        ))}

        <Pressable onPress={onRecharge} style={abs(W.recharge.box)}>
          <Cropped source={art.recharge} box={{ ...W.recharge.box, x: 0, y: 0 }} crop={W.recharge.crop} />
          {/* Futura Bold in Figma. */}
          <Label cx={W.recharge.box.w / 2} y={W.recharge.centerY - W.recharge.box.y - 12} size={W.recharge.size} lineHeight={24} weight="bold" width={160}>
            Recharge
          </Label>
        </Pressable>

        {records ? <RecordsDialog onClose={() => setRecords(false)} /> : null}
      </View>
    </View>
  );
}

/** Frame 1908 — Roulette Records, empty until the server keeps spins. */
function RecordsDialog({ onClose }: { onClose: () => void }) {
  const { px } = useDesignScale();
  const abs = useBox();
  const R = WHEEL.records;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: R.scrim }]} />
      <View pointerEvents="box-none" style={abs({ x: R.x, y: R.y, w: R.width, h: R.close.y + R.close.size })}>
        <Img source={art.panel} box={R.panel} resizeMode="cover" />
        {/* The logo's 50% is already in the export's alpha. */}
        <Img source={art.logo} box={{ x: R.logo.x, y: R.logo.y, w: R.logo.size, h: R.logo.size }} resizeMode="cover" />
        <Label cx={R.empty.centerX} y={R.empty.y} size={R.empty.size} lineHeight={R.empty.size * 1.5} weight="medium" width={160} opacity={0.5}>
          No Data Yet
        </Label>
        <Cropped source={art.tag} box={R.title.box} crop={WHEEL.record.crop} />
        <Label cx={R.empty.centerX} y={R.title.labelY} size={R.title.size} lineHeight={R.title.size * 1.5} weight="medium" width={R.title.box.w}>
          Roulette Records
        </Label>
        <Pressable onPress={onClose} hitSlop={px(6)} style={abs({ x: R.close.x, y: R.close.y, w: R.close.size, h: R.close.size })}>
          <SvgXml xml={closeRing} width={px(R.close.size)} height={px(R.close.size)} />
          <Image
            source={art.close}
            resizeMode="cover"
            style={{ position: 'absolute', left: px(R.close.icon.inset), top: px(R.close.icon.inset), width: px(R.close.icon.size), height: px(R.close.icon.size) }}
          />
        </Pressable>
      </View>
    </View>
  );
}
