import { closeM3 } from '../../assets/room/icons';
import { useUi } from '../wallet/walletParts';

/**
 * Shared bits of the live video flow (Figma section 2015:7862, "CREATE LIVE VIDEO SCREENS"). Every
 * number is a Figma pixel of the 402-wide frame, scaled by `px`; the design's Delight stands in as
 * Poppins like the rest of the app.
 */

export { useUi };

/** The teal of the Start button and the sheets' title bars. */
export const TEAL = '#48BBC7';
/** The gold of the host's name and the chat names. */
export const GOLD = '#FEDE0F';

export const closeDark = closeM3;
export const closeWhite = closeM3.replace('#1D1B20', '#FFFFFF');

/** Material "add" and "keyboard arrow left" (the design's keyboard_arrow_up, turned), in any colour. */
export const plusIcon = (color: string) =>
  `<svg width="24" height="24" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" fill="${color}"/></svg>`;
export const chevronLeft = (color: string) =>
  `<svg width="24" height="24" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" fill="${color}"/></svg>`;
