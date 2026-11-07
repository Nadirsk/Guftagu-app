// Verbatim SVG exports from the Guftagu Figma file oR0ROMu49sBPzInmvOcidH — the
// Wealth Level (2015:9314) and Charm Level (2015:9378) pages, which share these.
//
// The project has no metro SVG transformer, so the markup is inlined here and
// rendered with react-native-svg <SvgXml>. Do not hand-edit the paths — re-export
// from Figma and regenerate this file from the .svg files in ./svg.

/** Rectangle 1 (2015:9315) — 402x1334, a 90%-opaque dark gradient over the frame's white. */
export const background = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="402" height="1334" viewBox="0 0 402 1334" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="Rectangle 1" d="M0 0H402V1334H0V0Z" fill="url(#paint0_linear_0_5)" fill-opacity="0.9"/>
<defs>
<linearGradient id="paint0_linear_0_5" x1="201" y1="-1.8195e-07" x2="210.318" y2="1339.31" gradientUnits="userSpaceOnUse">
<stop offset="0.00321258"/>
<stop offset="0.609201" stop-color="#0F0E06"/>
<stop offset="0.905249" stop-color="#02050C"/>
</linearGradient>
</defs>
</svg>`;

/** Ellipse 54 (2015:9339) — the slider thumb, with its own drop shadow (17px ellipse in a 28.6px box). */
export const knob = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="28.6" height="28.6" viewBox="0 0 28.6 28.6" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Ellipse 54" filter="url(#filter0_d_0_10)">
<path d="M17.8 13.3C17.8 17.9944 13.9944 21.8 9.3 21.8C4.60558 21.8 0.8 17.9944 0.8 13.3C0.8 8.60558 4.60558 4.8 9.3 4.8C13.9944 4.8 17.8 8.60558 17.8 13.3Z" fill="url(#paint0_linear_0_10)"/>
</g>
<defs>
<filter id="filter0_d_0_10" x="0" y="0" width="28.6" height="28.6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="5" dy="1"/>
<feGaussianBlur stdDeviation="2.9"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_10"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_10" result="shape"/>
</filter>
<linearGradient id="paint0_linear_0_10" x1="9.3" y1="4.8" x2="9.3" y2="21.8" gradientUnits="userSpaceOnUse">
<stop stop-color="#D9D9D9"/>
<stop offset="1" stop-color="#F2EAEA"/>
</linearGradient>
</defs>
</svg>`;

/** Line 10–20 — the row rules in Level Intervals (333px, white at 20%). */
export const divider = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="333" height="1" viewBox="0 0 333 1" fill="none" xmlns="http://www.w3.org/2000/svg">
<line id="Line 10" opacity="0.2" y1="0.5" x2="333" y2="0.5" stroke="white"/>
</svg>`;

/** chevron_backward (2015:9319) — the glyph only; Figma centres it in a 32px box. */
export const chevronBackward = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="9.86667" height="16" viewBox="0 0 9.86667 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="icon" d="M8 16L0 8L8 0L9.86667 1.86667L3.73333 8L9.86667 14.1333L8 16Z" fill="white"/>
</svg>`;
