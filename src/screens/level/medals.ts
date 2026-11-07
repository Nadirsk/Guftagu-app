import type { ImageSourcePropType } from 'react-native';

import type { LevelKind } from './geometry';

/**
 * The grade medals from Level Intervals & Grade Medals (2015:9314 / 2015:9378): one per
 * band of ten levels, Lv.1–10 first.
 */
export const MEDALS: Record<LevelKind, ImageSourcePropType[]> = {
  wealth: [
    require('../../assets/level/wealth/medal-10.png'),
    require('../../assets/level/wealth/medal-20.png'),
    require('../../assets/level/wealth/medal-30.png'),
    require('../../assets/level/wealth/medal-40.png'),
    require('../../assets/level/wealth/medal-50.png'),
    require('../../assets/level/wealth/medal-60.png'),
    require('../../assets/level/wealth/medal-70.png'),
    require('../../assets/level/wealth/medal-80.png'),
    require('../../assets/level/wealth/medal-90.png'),
    require('../../assets/level/wealth/medal-100.png'),
    require('../../assets/level/wealth/medal-110.png'),
    require('../../assets/level/wealth/medal-120.png'),
  ],
  charm: [
    require('../../assets/level/charm/medal-10.png'),
    require('../../assets/level/charm/medal-20.png'),
    require('../../assets/level/charm/medal-30.png'),
    require('../../assets/level/charm/medal-40.png'),
    require('../../assets/level/charm/medal-50.png'),
    require('../../assets/level/charm/medal-60.png'),
    require('../../assets/level/charm/medal-70.png'),
    require('../../assets/level/charm/medal-80.png'),
    require('../../assets/level/charm/medal-90.png'),
    require('../../assets/level/charm/medal-100.png'),
    require('../../assets/level/charm/medal-110.png'),
    require('../../assets/level/charm/medal-120.png'),
  ],
};

/**
 * The same medals with their printed "LVEL10"… label painted out (`*-plain.png`, made from
 * the originals by filling the label box from the pill above and below it), so a badge can
 * print the user's exact level instead of the band's top.
 */
export const PLAIN_MEDALS: Record<LevelKind, ImageSourcePropType[]> = {
  wealth: [
    require('../../assets/level/wealth/medal-10-plain.png'),
    require('../../assets/level/wealth/medal-20-plain.png'),
    require('../../assets/level/wealth/medal-30-plain.png'),
    require('../../assets/level/wealth/medal-40-plain.png'),
    require('../../assets/level/wealth/medal-50-plain.png'),
    require('../../assets/level/wealth/medal-60-plain.png'),
    require('../../assets/level/wealth/medal-70-plain.png'),
    require('../../assets/level/wealth/medal-80-plain.png'),
    require('../../assets/level/wealth/medal-90-plain.png'),
    require('../../assets/level/wealth/medal-100-plain.png'),
    require('../../assets/level/wealth/medal-110-plain.png'),
    require('../../assets/level/wealth/medal-120-plain.png'),
  ],
  charm: [
    require('../../assets/level/charm/medal-10-plain.png'),
    require('../../assets/level/charm/medal-20-plain.png'),
    require('../../assets/level/charm/medal-30-plain.png'),
    require('../../assets/level/charm/medal-40-plain.png'),
    require('../../assets/level/charm/medal-50-plain.png'),
    require('../../assets/level/charm/medal-60-plain.png'),
    require('../../assets/level/charm/medal-70-plain.png'),
    require('../../assets/level/charm/medal-80-plain.png'),
    require('../../assets/level/charm/medal-90-plain.png'),
    require('../../assets/level/charm/medal-100-plain.png'),
    require('../../assets/level/charm/medal-110-plain.png'),
    require('../../assets/level/charm/medal-120-plain.png'),
  ],
};

/**
 * Where the printed label started on each band's medal, in medal pixels (of 200) —
 * measured from the originals; the emblem ends just before it.
 */
export const LABEL_LEFT: Record<LevelKind, number[]> = {
  wealth: [74, 74, 74, 74, 76, 74, 74, 74, 74, 74, 74, 74],
  charm: [70, 70, 70, 70, 70, 70, 74, 74, 74, 74, 75, 75],
};

/** Medal bitmaps are 200x73. */
export const MEDAL_W = 200;
export const MEDAL_H = 73;
export const MEDAL_ASPECT = MEDAL_W / MEDAL_H;

/**
 * Which band a user at `level` is in: Lv.1–10 is the first, Lv.11–20 the second, and so
 * on, capped at the last. Level 0 (not yet at level 1) sits in the first.
 */
export function bandFor(kind: LevelKind, level: number | null | undefined): number {
  return Math.min(MEDALS[kind].length - 1, Math.max(0, Math.ceil((level ?? 0) / 10) - 1));
}
