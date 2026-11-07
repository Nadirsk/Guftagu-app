// SVG exports from the Guftagu Figma file oR0ROMu49sBPzInmvOcidH, Item Bag (2015:9442).
// The project has no metro SVG transformer, so the markup is inlined and drawn with
// react-native-svg <SvgXml>. Paths are verbatim; do not hand-edit them.

/** circle-check (2015:9547): 17px, on the item you are wearing. */
export const circleCheck = `<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.375 8.5L7.79167 9.91667L10.625 7.08333M15.5833 8.5C15.5833 12.412 12.412 15.5833 8.5 15.5833C4.58798 15.5833 1.41667 12.412 1.41667 8.5C1.41667 4.58798 4.58798 1.41667 8.5 1.41667C12.412 1.41667 15.5833 4.58798 15.5833 8.5Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke="white"/>
</svg>`;

/**
 * Ellipse 1983 (white) / Ellipse 1984 (#48BBC7): a 76px circle blurred by 15.35, in the
 * 137.4px box its blur needs. Two of them make each card's glow in its top-left corner.
 */
const glow = (fill: string, id: string) => `<svg width="137.4" height="137.4" viewBox="0 0 137.4 137.4" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#${id})">
<circle cx="68.7" cy="68.7" r="38" fill="${fill}"/>
</g>
<defs>
<filter id="${id}" x="0" y="0" width="137.4" height="137.4" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="15.35" result="effect1_foregroundBlur"/>
</filter>
</defs>
</svg>`;

export const glowWhite = glow('white', 'itemBagGlowWhite');
export const glowCyan = glow('#48BBC7', 'itemBagGlowCyan');

/**
 * inbox (2015:9585, a Material 3 kit instance): a 54px box, its 40.5px glyph inset 6.75.
 * The glyph is M3/sys/light/surface (#FEF7FF) and renders at 30% over the card —
 * the frame's export reads #524F5E on #080719.
 */
export const inbox = `<svg width="54" height="54" viewBox="-6.75 -6.75 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.5 40.5C3.2625 40.5 2.19375 40.0688 1.29375 39.2063C0.43125 38.3063 0 37.2375 0 36V4.5C0 3.2625 0.43125 2.2125 1.29375 1.35C2.19375 0.450001 3.2625 0 4.5 0H36C37.2375 0 38.2875 0.450001 39.15 1.35C40.05 2.2125 40.5 3.2625 40.5 4.5V36C40.5 37.2375 40.05 38.3063 39.15 39.2063C38.2875 40.0688 37.2375 40.5 36 40.5H4.5ZM4.5 36H36V29.25H29.25C28.125 30.675 26.775 31.7813 25.2 32.5688C23.6625 33.3563 22.0125 33.75 20.25 33.75C18.4875 33.75 16.8188 33.3563 15.2438 32.5688C13.7063 31.7813 12.375 30.675 11.25 29.25H4.5V36ZM20.25 29.25C21.675 29.25 22.9688 28.8375 24.1313 28.0125C25.2938 27.1875 26.1 26.1 26.55 24.75H36V4.5H4.5V24.75H13.95C14.4 26.1 15.2063 27.1875 16.3688 28.0125C17.5313 28.8375 18.825 29.25 20.25 29.25ZM4.5 36H11.25C12.375 36 13.7063 36 15.2438 36C16.8188 36 18.4875 36 20.25 36C22.0125 36 23.6625 36 25.2 36C26.775 36 28.125 36 29.25 36H36H4.5Z" fill="#FEF7FF" fill-opacity="0.3"/>
</svg>`;
