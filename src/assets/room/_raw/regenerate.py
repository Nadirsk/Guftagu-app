"""Regenerates mobile/src/assets/room/icons.ts and the room PNGs from assets/room/_raw."""
import re, shutil, sys
from pathlib import Path
from PIL import Image

raw = Path(sys.argv[1]); out = raw.parent

ICONS = {  # export name: (raw file, note)
    'seatRing': 'seatRing57', 'seatRingVip': 'seatRing62', 'seat': 'seatStatus',
    'seatVip': 'seatStatusGold', 'followHeart': 'followHeart', 'share': 'transfer',
    'power': 'power', 'powerRed': 'drawerPower', 'minimize': 'minimize', 'drawerLine': 'drawerLine',
    'controlRing': 'ctrlRing63', 'controlMic': 'ctrlMic', 'controlEmoji': 'ctrlEmoji',
    'emoji': 'emojiGlyph', 'volume': 'volumeGroup', 'giftRing': 'giftRing59', 'menu': 'menuButton',
    'flagIN': 'flagIN', 'liveCount': 'liveCountPill', 'liveWave': 'liveCountWave',
    'toolBrush': 'toolBrush', 'toolTheme': 'toolTheme', 'toolSound': 'toolSound', 'toolMusic': 'toolMusic',
    'toolKick': 'toolKick', 'toolMute': 'toolMicOff', 'toolLock': 'toolLock', 'redPacketShine': 'redPacketShine',
    'close': 'sheetX', 'check': 'check', 'radioOff': 'radioOff', 'radioOn': 'radioOn', 'search': 'musicSearch',
    'camera': 'createCamera', 'plus': 'createPlus',
}

def clean(name, svg):
    # react-native-svg has no feMorphology; the dilate only widens the shadow by 2px.
    svg = re.sub(r'<feMorphology[^>]*/>\n?', '', svg)
    if name == 'seat':
        svg = svg.replace('fill="#7E5353"', 'fill="currentColor"')
    if name == 'seatVip':
        # The gold fill Figma paints through this shape as a mask (Status / Available).
        svg = svg.replace('fill="black"', 'fill="url(#seatGold)"').replace(
            '</svg>', '<defs><linearGradient id="seatGold" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#FFDE07"/><stop offset="0.45" stop-color="#998504"/>'
            '<stop offset="0.9" stop-color="#C0AE38"/></linearGradient></defs>\n</svg>')
    if name == 'controlMic':
        svg = svg.replace('stroke="#FFF8F8"', 'stroke="currentColor"')
    return svg

lines = ['// Verbatim SVG exports from the voice-room section (66:544) of Figma file',
         '// 5tXLIf98AkO8fPRVOQRDc0, regenerated from the .svg files in ./_raw.',
         '//',
         '// Departures from "verbatim", applied by the regeneration step:',
         '//   * <feMorphology> is dropped from the ring shadows - react-native-svg has no',
         '//     such primitive, and it only widened each shadow by 2px;',
         '//   * `seat` is the Status mask shape, filled with currentColor (#FFC3DD in Figma);',
         '//   * `seatVip` carries the gold ramp Figma paints through that mask;',
         '//   * `controlMic` strokes with currentColor so a muted mic can dim.', '']
for name, f in ICONS.items():
    svg = clean(name, (raw / f'{f}.svg').read_text(encoding='utf-8')).strip()
    lines.append(f'export const {name} = `{svg}\n`;\n')
(out / 'icons.ts').write_text('\n'.join(lines), encoding='utf-8')

PNGS = {'award': 'award', 'gift-box': 'giftBox', 'lucky-wheel': 'luckyWheel', 'badge-strip': 'greenHeart',
        'red-packet-coin': 'redPacketCoin', 'lucky-draw': 'luckyDraw', 'lucky-number': 'luckyNumber',
        'share-facebook': 'shareFacebook', 'share-whatsapp': 'shareWhatsApp', 'share-friends': 'shareFriends'}
for dst, src in PNGS.items():
    shutil.copy(raw / f'{src}.png', out / f'{dst}.png')
# 2 MB of RGB PNG for a photo shown at 50% opacity - a JPEG is a tenth of that.
Image.open(raw / 'background.png').convert('RGB').save(out / 'background.jpg', quality=85)
Image.open(raw / 'gamesSheet.png').convert('RGB').save(out / 'games-sheet.jpg', quality=88)
print('ok')
