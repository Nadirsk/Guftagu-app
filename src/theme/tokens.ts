// Design tokens extracted from the Guftagu Figma file (EQpL9IsQ3klbFfDgKGQVIu).
// Reuse these across screens instead of re-reading them from Figma or a screenshot.
// Add to this file whenever a new screen introduces a color/size not listed yet.

export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  facebookBlue: '#2B56B3',
  linkBlue: '#078FFF',
  languagePillBg: 'rgba(13,104,178,0.68)',
  borderMuted: 'rgba(0,0,0,0.32)',
  textMuted: 'rgba(0,0,0,0.5)',
  inputBorder: 'rgba(0,0,0,0.22)', // form field outlines (profile setup, email auth)
  inputPlaceholder: 'rgba(0,0,0,0.3)', // email field placeholder
  otpBorder: 'rgba(0,0,0,0.4)', // verification code box outlines
  phoneFieldBorder: 'rgba(0,0,0,0.3)', // phone auth field outline
  phonePlaceholder: 'rgba(0,0,0,0.4)', // phone auth field placeholder
  actionOrange: '#FF3300', // "Resend Code" link
  overlay: 'rgba(0,0,0,0.21)', // bottom sheet scrim (node 297:3328)
  sheetFieldFill: 'rgba(23,23,23,0.06)', // bottom sheet search box (node 297:3330)
  sheetRowFill: 'rgba(23,23,23,0.12)', // bottom sheet option rows (node 297:3334)
  sheetPlaceholder: 'rgba(0,0,0,0.36)', // bottom sheet search placeholder
  sheetHandle: 'rgba(0,0,0,0.18)', // bottom sheet drag handle
  radioBorder: 'rgba(0,0,0,0.22)', // unselected option radio outline (Ellipse 107)
  radioSelected: '#00B3FF', // selected option radio fill (Ellipse 108)
  searchBorder: 'rgba(0,0,0,0.18)', // party header search button outline (node 15:453)
  countryPillBorder: '#999999', // miscellaneous/tab---unselected (party country chips)
  sectionAction: '#8C9198', // section "More" link (node 19:108)
  createRingBorder: 'rgba(0,0,0,0.31)', // "Create" story ring (node 19:347)
  // Bottom nav. Figma draws it for a dark surface — pink selected item
  // (#EB11AA label / #C32FAE icon, nodes 15:309-15:310) and white unselected
  // ones. The home feed is white, so the bar follows the screen's own palette
  // instead: solid black selected, muted black unselected, exactly like the
  // Following/Party/Live tabs above it.
  navActive: '#000000',
  navIdle: 'rgba(0,0,0,0.5)',
  searchFieldBorder: 'rgba(0,0,0,0.3)', // search screen field outline (node 25:394)
  searchPlaceholder: 'rgba(0,0,0,0.34)', // "Enter the name" (node 25:382)
  followLabel: '#FFFDFD', // "Follow" chip label (node 25:417)
  // Moment screen (node 25:451). Everything else that screen draws — the orange
  // "+" disc, the bell outline, the wave badge, the two name badges — comes in
  // as an export, so only the type colours live here.
  momentRule: '#161616', // Line 83 — the selected tab's underline
  momentCount: '#8E8E93', // the comment/like counts (nodes 73:739 / 73:731)
  // "2026-08-25" / "04:23:22 - India" are plain black at 30% (nodes 73:711/712).
  momentMeta: 'rgba(0,0,0,0.3)',
  // Post a moment (node 99:1340).
  postFieldBorder: 'rgba(0,0,0,0.29)', // "Whats on your mind" outline (99:1366)
  postPlaceholder: 'rgba(0,0,0,0.34)', // its placeholder (99:1367)
  postDropzoneBorder: '#009DFF', // the dashed upload box (99:1386)
  postDropzoneLabel: 'rgba(0,0,0,0.3)', // "Upload images and videos…" (99:1443)
  postAudienceBorder: 'rgba(0,0,0,0.24)', // the audience select (99:1446)
  postButton: '#DE4200', // the "Post" pill (99:1467)
  commentReply: '#0077FF', // Post Details "Reply" link (node 82:900)
  goldGradient: ['#4e4714', '#fbbc05'] as const,
  darkGradient: ['#4e4714', '#251e0a'] as const,
};

export const typography = {
  fontFamily: {
    // Figma specifies "Delight" for form/button labels (profile setup screen).
    // Delight isn't a distributable/Google font, so we fall back to the app's
    // Poppins family to keep typography consistent without an unlicensed font.
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  size: {
    body: 14, // language pill label, sign-up footer
    button: 15, // auth buttons, "Other Login" divider
    input: 15, // form field text/placeholders
    confirmLabel: 16, // Confirm button label
    heading: 32, // "Welcome"
  },
};

export const radii = {
  pill: 30, // language pill, auth buttons
  circle: 26, // mail/phone social circles (52px diameter)
  input: 10, // form field boxes
  sheet: 15, // bottom sheet top corners (node 297:3329)
};

export const spacing = {
  screenPaddingHorizontal: 18,
  authButton: {
    height: 52,
    iconGap: 19,
  },
  languagePill: {
    height: 38,
    iconGap: 8,
    paddingHorizontal: 16,
  },
  iconCircle: {
    size: 52,
  },
  divider: {
    lineWidth: 24,
    lineHeight: 1,
  },
  gaps: {
    authButtons: 14, // between Google/Facebook buttons
    dividerRow: 12, // between line and "Other Login" text
    iconRow: 35, // between mail/phone circles
  },
};

// Note: ProfileSetupScreen is laid out straight from its Figma frame (node 2:2)
// and keeps its own geometry table next to the JSX, so its box sizes are not
// duplicated here. Only cross-screen values belong in this file.
