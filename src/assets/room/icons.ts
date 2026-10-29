// Verbatim SVG exports from the voice-room section (66:544) of Figma file
// 5tXLIf98AkO8fPRVOQRDc0, regenerated from the .svg files in ./_raw.
//
// Departures from "verbatim", applied by the regeneration step:
//   * <feMorphology> is dropped from the ring shadows - react-native-svg has no
//     such primitive, and it only widened each shadow by 2px;
//   * `seat` is the Status mask shape, filled with currentColor (#FFC3DD in Figma);
//   * `seatVip` carries the gold ramp Figma paints through that mask;
//   * `controlMic` strokes with currentColor so a muted mic can dim.

export const seatRing = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="57.0534" height="57.0534" viewBox="0 0 57.0534 57.0534" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g id="Ellipse 57" filter="url(#filter0_d_0_138)">
<use xlink:href="#stroke0_0_138" fill="#4D2242" fill-opacity="0.5" shape-rendering="crispEdges"/>
<mask id="stroke1_0_138" fill="white">
<use xlink:href="#stroke0_0_138"/>
</mask>
<path d="M52.0534 24.5267C52.0534 37.5201 41.5201 48.0534 28.5267 48.0534C15.5333 48.0534 5 37.5201 5 24.5267C5 11.5333 15.5333 1 28.5267 1C41.5201 1 52.0534 11.5333 52.0534 24.5267Z" stroke-width="2" stroke="#FFFEDB" stroke-opacity="0.47" shape-rendering="crispEdges" mask="url(#stroke1_0_138)"/>
</g>
<defs>
<filter id="filter0_d_0_138" x="0" y="0" width="57.0534" height="57.0534" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2.5"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.997596 0 0 0 0 0.971154 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_138"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_138" result="shape"/>
</filter>
<path id="stroke0_0_138" d="M52.0534 24.5267C52.0534 37.5201 41.5201 48.0534 28.5267 48.0534C15.5333 48.0534 5 37.5201 5 24.5267C5 11.5333 15.5333 1 28.5267 1C41.5201 1 52.0534 11.5333 52.0534 24.5267Z"/>
</defs>
</svg>
`;

export const seatRingVip = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="55.0534" height="55.0534" viewBox="0 0 55.0534 55.0534" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g id="Ellipse 62" filter="url(#filter0_d_0_124)">
<use xlink:href="#stroke0_0_124" fill="#FFFDF3" fill-opacity="0.23" shape-rendering="crispEdges"/>
<mask id="stroke1_0_124" fill="white">
<use xlink:href="#stroke0_0_124"/>
</mask>
<path d="M51.0534 23.5267C51.0534 36.5201 40.5201 47.0534 27.5267 47.0534C14.5333 47.0534 4 36.5201 4 23.5267C4 10.5333 14.5333 0 27.5267 0C40.5201 0 51.0534 10.5333 51.0534 23.5267Z" stroke-width="2" stroke="#FFDE07" stroke-opacity="0.44" shape-rendering="crispEdges" mask="url(#stroke1_0_124)"/>
</g>
<defs>
<filter id="filter0_d_0_124" x="0" y="0" width="55.0534" height="55.0534" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_124"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_124" result="shape"/>
</filter>
<path id="stroke0_0_124" d="M51.0534 23.5267C51.0534 36.5201 40.5201 47.0534 27.5267 47.0534C14.5333 47.0534 4 36.5201 4 23.5267C4 10.5333 14.5333 0 27.5267 0C40.5201 0 51.0534 10.5333 51.0534 23.5267Z"/>
</defs>
</svg>
`;

export const seat = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="22.686" height="25.2078" viewBox="0 0 22.686 25.2078" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="seat" d="M18.8955 23.1963C18.9694 23.8816 18.8734 24.4886 18.3193 24.9297C17.8687 25.2841 17.2332 25.2994 16.7529 24.9766C16.1397 24.5669 16.0214 23.9367 16.0879 23.1963H18.8955ZM6.6084 23.2119C6.68227 23.8972 6.57128 24.5043 6.00977 24.9297C5.55176 25.2762 4.92357 25.2916 4.44336 24.9609C3.83756 24.5435 3.72597 23.921 3.7998 23.1885H6.51172C6.53388 23.1885 6.56407 23.204 6.6084 23.2119ZM19.3389 7.29883C20.3806 6.76328 21.6512 7.14965 22.2939 8.18945C22.9292 9.21354 22.7813 10.5997 21.9316 11.4189C21.7914 11.5528 21.7471 11.6791 21.7471 11.876C21.7545 14.1132 21.7545 16.3429 21.7471 18.5801C21.7396 20.4233 20.5944 21.8648 18.8877 22.1562C18.7178 22.1877 18.5405 22.1875 18.3633 22.1875H4.34668C2.66962 22.1873 1.34712 21.0686 1.01465 19.375C0.955625 19.0759 0.940437 18.7689 0.94043 18.4697C0.933041 16.2719 0.933041 14.0816 0.94043 11.8838C0.94043 11.6947 0.896244 11.5607 0.755859 11.4268C-0.0198023 10.6862 -0.218915 9.45742 0.253906 8.45703C0.741559 7.42505 1.77575 6.89759 2.85449 7.11816C3.83704 7.31511 4.62016 8.25187 4.70898 9.34668C4.72376 9.51999 4.73145 9.70169 4.73145 9.875V18.1387H17.9492C17.9566 18.0048 17.9648 17.8788 17.9648 17.7607V9.72559C17.9648 8.6227 18.4005 7.78725 19.3389 7.29883ZM13.0439 15.1377C13.8935 15.1377 14.7432 15.114 15.5928 15.1455C15.999 15.1613 16.4053 15.2787 16.8115 15.3574C16.9667 15.3889 17.0337 15.4917 17.0264 15.6729C17.0116 16.1454 17.0186 16.6258 17.0186 17.1377H5.68457C5.68457 16.5944 5.67664 16.0589 5.69141 15.5234C5.69141 15.4683 5.80263 15.3898 5.86914 15.374C6.29019 15.2874 6.7186 15.1534 7.13965 15.1455C9.10504 15.1219 11.0712 15.1377 13.0439 15.1377ZM10.5605 0.0351562C15.4001 -0.382358 18.8585 2.98175 19.9668 6.01465C19.5827 6.15641 19.1691 6.2592 18.8145 6.45605C17.6028 7.14134 17.0261 8.25971 17.0186 9.70898V14.334C15.9398 13.9874 14.8681 14.129 13.8115 14.1211C11.8537 14.1053 9.89536 14.1133 7.9375 14.1133C7.19139 14.1211 6.44503 14.0659 5.67676 14.3652V9.68555C5.66187 7.77932 4.53906 6.39319 2.78809 6.08594C2.77333 6.08594 2.75134 6.06949 2.69238 6.0459C3.16525 4.86445 3.83011 3.8325 4.67969 2.93457C6.31249 1.22525 8.27763 0.240037 10.5605 0.0351562Z" fill="currentColor"/>
</svg>
`;

export const seatVip = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="22.6813" height="25.2015" viewBox="0 0 22.6813 25.2015" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="seat" d="M18.8916 23.1904C18.9655 23.8755 18.8692 24.4818 18.3154 24.9229C17.8648 25.2773 17.2292 25.2936 16.749 24.9707C16.1359 24.5611 16.0175 23.9308 16.084 23.1904H18.8916ZM6.60645 23.2061C6.68029 23.8911 6.56978 24.4976 6.00879 24.9229C5.55086 25.2693 4.92251 25.2857 4.44238 24.9551C3.83664 24.5376 3.72593 23.9151 3.7998 23.1826H6.51074C6.53285 23.1827 6.56234 23.1982 6.60645 23.2061ZM19.335 7.29687C20.3764 6.76153 21.6464 7.1472 22.2891 8.18652C22.9243 9.21037 22.7772 10.5969 21.9277 11.416C21.7874 11.5499 21.7432 11.6761 21.7432 11.873C21.7505 14.1097 21.7506 16.3385 21.7432 18.5752C21.7358 20.4182 20.5902 21.86 18.8838 22.1514C18.714 22.1828 18.5366 22.1826 18.3594 22.1826H4.34668C2.66995 22.1826 1.3472 21.0642 1.01465 19.3711C0.955552 19.0718 0.94043 18.7641 0.94043 18.4648C0.933043 16.2676 0.933044 14.0781 0.94043 11.8809C0.94043 11.6918 0.896214 11.5577 0.755859 11.4238C-0.0196921 10.6835 -0.218844 9.45431 0.253906 8.4541C0.741526 7.42259 1.77611 6.89473 2.85449 7.11523C3.83681 7.31229 4.61937 8.25009 4.70801 9.34473C4.72277 9.51789 4.73047 9.6989 4.73047 9.87207V18.1338H17.9463C17.9537 18 17.9609 17.8739 17.9609 17.7559V9.72266C17.9609 8.62001 18.3968 7.78519 19.335 7.29687ZM13.041 15.1338C13.8905 15.1338 14.7404 15.1101 15.5898 15.1416C15.996 15.1574 16.4025 15.2748 16.8086 15.3535C16.9635 15.3851 17.0298 15.4879 17.0225 15.6689C17.0077 16.1415 17.0146 16.6219 17.0146 17.1338H5.68359C5.68359 16.5905 5.67567 16.055 5.69043 15.5195C5.69043 15.4644 5.80168 15.3859 5.86816 15.3701C6.2892 15.2835 6.71764 15.1495 7.13867 15.1416C9.10359 15.118 11.0687 15.1338 13.041 15.1338ZM10.5586 0.0351562C15.3971 -0.382268 18.8548 2.98046 19.9629 6.0127C19.5789 6.15443 19.1651 6.2573 18.8105 6.4541C17.5991 7.13931 17.022 8.25784 17.0146 9.70703V14.3301C15.9363 13.9837 14.8648 14.1251 13.8086 14.1172C11.8512 14.1014 9.89388 14.1094 7.93652 14.1094C7.19043 14.1173 6.44404 14.062 5.67578 14.3613V9.68359C5.66101 7.7776 4.53785 6.39115 2.78711 6.08398C2.77234 6.08367 2.74986 6.0683 2.69141 6.04492C3.16417 4.86355 3.82923 3.83144 4.67871 2.93359C6.31121 1.22454 8.27607 0.239968 10.5586 0.0351562Z" fill="url(#seatGold)"/>
<defs><linearGradient id="seatGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDE07"/><stop offset="0.45" stop-color="#998504"/><stop offset="0.9" stop-color="#C0AE38"/></linearGradient></defs>
</svg>
`;

export const followHeart = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="41.5215" height="36.5714" viewBox="0 0 41.5215 36.5714" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g id="Group 1">
<g id="Vector">
<use xlink:href="#stroke0_0_151" fill="url(#paint0_linear_0_151)"/>
<mask id="stroke1_0_151" fill="white">
<use xlink:href="#stroke0_0_151"/>
</mask>
<path d="M21.3779 4.95574C22.4633 3.49264 24.4099 1.71077 26.9207 0.732543C29.4054 -0.235501 32.4561 -0.42504 35.8426 1.28664C40.1569 3.46718 41.7637 7.241 41.4924 11.3561C41.2176 15.521 39.006 20.0295 35.6422 23.4299C32.2413 26.8679 26.3168 32.8546 22.0043 36.1697C21.2851 36.7227 20.2987 36.7035 19.5832 36.1198C15.6142 32.8813 9.21092 26.7979 5.87923 23.4299C2.51534 20.0295 0.303768 15.521 0.0291072 11.3561C-0.242298 7.241 1.3646 3.46718 5.67876 1.28664C9.06529 -0.42504 12.116 -0.235501 14.6007 0.732543C17.1115 1.71077 19.0581 3.49264 20.1437 4.95574L20.7608 5.78747L21.3779 4.95574Z" stroke="#E581CF" mask="url(#stroke1_0_151)"/>
</g>
<path id="Vector_2" d="M20.9161 12H19.9267V17.6718H15V18.8108H19.9267V24.4826H20.9161V18.8108H25.8428V17.6718H20.9161V12Z" fill="white" stroke="white"/>
</g>
<defs>
<linearGradient id="paint0_linear_0_151" x1="20.7607" y1="0" x2="20.7607" y2="36.5714" gradientUnits="userSpaceOnUse">
<stop stop-color="#B91D97"/>
<stop offset="0.514423" stop-color="#BF289E"/>
<stop offset="1" stop-color="#8C1171"/>
</linearGradient>
<path id="stroke0_0_151" d="M21.3779 4.95574C22.4633 3.49264 24.4099 1.71077 26.9207 0.732543C29.4054 -0.235501 32.4561 -0.42504 35.8426 1.28664C40.1569 3.46718 41.7637 7.241 41.4924 11.3561C41.2176 15.521 39.006 20.0295 35.6422 23.4299C32.2413 26.8679 26.3168 32.8546 22.0043 36.1697C21.2851 36.7227 20.2987 36.7035 19.5832 36.1198C15.6142 32.8813 9.21092 26.7979 5.87923 23.4299C2.51534 20.0295 0.303768 15.521 0.0291072 11.3561C-0.242298 7.241 1.3646 3.46718 5.67876 1.28664C9.06529 -0.42504 12.116 -0.235501 14.6007 0.732543C17.1115 1.71077 19.0581 3.49264 20.1437 4.95574L20.7608 5.78747L21.3779 4.95574Z"/>
</defs>
</svg>
`;

export const share = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="transfer">
<path d="M0 0V19H20V12.6667H17.7778V16.8889H2.22222V2.11111H6.66667V0H0Z" fill="white"/>
<path d="M20 0H11.1111V2.11111H16.1111L6.66667 11.0833L8.33333 12.6667L17.7778 3.69444V8.44444H20V0Z" fill="white"/>
</g>
</svg>
`;

export const power = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="power">
<path id="Icon" d="M14.5 13.8958V4.83333M8.10592 7.25C6.09907 9.02128 4.83333 11.6128 4.83333 14.5C4.83333 19.8388 9.16125 24.1667 14.5 24.1667C19.8388 24.1667 24.1667 19.8388 24.1667 14.5C24.1667 11.6128 22.9009 9.02128 20.8941 7.25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="white"/>
</g>
</svg>
`;

export const powerRed = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="power">
<path id="Icon" d="M14.5 13.8958V4.83333M8.10592 7.25C6.09907 9.02128 4.83333 11.6128 4.83333 14.5C4.83333 19.8388 9.16125 24.1667 14.5 24.1667C19.8388 24.1667 24.1667 19.8388 24.1667 14.5C24.1667 11.6128 22.9009 9.02128 20.8941 7.25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="#FF0000"/>
</g>
</svg>
`;

export const minimize = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="minimize-2">
<path id="Vector" d="M16.9167 12.0833L25.375 3.625M16.9167 4.83333V12.0833H24.1667M3.625 25.375L12.0833 16.9167M12.0833 24.1667V16.9167H4.83333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const drawerLine = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="234" height="0.6" viewBox="0 0 234 0.6" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="Line 1" opacity="0.5" d="M0 0.3H234" stroke-width="0.6" stroke="white"/>
</svg>
`;

export const controlRing = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Ellipse 63" opacity="0.2" filter="url(#filter0_d_0_114)">
<circle cx="23" cy="19" r="17" fill="black"/>
<circle cx="23" cy="19" r="16.5" stroke="#FFDE07"/>
</g>
<defs>
<filter id="filter0_d_0_114" x="0" y="0" width="46" height="46" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_114"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_114" result="shape"/>
</filter>
</defs>
</svg>
`;

export const controlMic = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group 1597881061">
<g id="Ellipse 63" opacity="0.2" filter="url(#filter0_d_0_155)">
<circle cx="23" cy="19" r="17" fill="black"/>
<circle cx="23" cy="19" r="16.5" stroke="#FFDE07"/>
</g>
<g id="mic">
<path id="Vector" d="M22.9747 26.2148V29.2148M15.9747 17.2148V19.2148C15.9747 21.0714 16.7122 22.8518 18.0249 24.1646C19.3377 25.4773 21.1181 26.2148 22.9747 26.2148C24.8312 26.2148 26.6116 25.4773 27.9244 24.1646C29.2372 22.8518 29.9747 21.0714 29.9747 19.2148V17.2148M22.9747 9.21484C24.6315 9.21484 25.9747 10.558 25.9747 12.2148V19.2148C25.9747 20.8717 24.6315 22.2148 22.9747 22.2148C21.3178 22.2148 19.9747 20.8717 19.9747 19.2148V12.2148C19.9747 10.558 21.3178 9.21484 22.9747 9.21484Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>
</g>
</g>
<defs>
<filter id="filter0_d_0_155" x="0" y="0" width="46" height="46" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_155"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_155" result="shape"/>
</filter>
</defs>
</svg>
`;

export const controlEmoji = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group 1597881062">
<g id="Ellipse 63" opacity="0.2" filter="url(#filter0_d_0_105)">
<circle cx="23" cy="19" r="17" fill="black"/>
<circle cx="23" cy="19" r="16.5" stroke="#FFDE07"/>
</g>
</g>
<defs>
<filter id="filter0_d_0_105" x="0" y="0" width="46" height="46" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_105"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_105" result="shape"/>
</filter>
</defs>
</svg>
`;

export const emoji = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="20" height="20.0001" viewBox="0 0 20 20.0001" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group 11">
<path id="Rectangle 16 (Stroke)" d="M0 10.0001C0 4.4772 4.47715 5.05447e-05 10 5.05447e-05C15.5228 5.05447e-05 20 4.4772 20 10.0001C20 15.5229 15.5228 20.0001 10 20.0001C4.47715 20.0001 0 15.5229 0 10.0001ZM10 1.66672C5.39763 1.66672 1.66667 5.39768 1.66667 10.0001C1.66667 14.6024 5.39763 18.3334 10 18.3334C14.6024 18.3334 18.3333 14.6024 18.3333 10.0001C18.3333 5.39768 14.6024 1.66672 10 1.66672Z" fill-rule="evenodd" clip-rule="evenodd" fill="white"/>
<path id="Rectangle 17 (Stroke)" d="M5.87311 12.8998C6.17675 12.5539 6.70327 12.5197 7.04914 12.8233C8.75967 14.325 11.5724 14.325 13.2829 12.8233C13.6288 12.5197 14.1553 12.5539 14.4589 12.8998C14.7626 13.2456 14.7283 13.7722 14.3825 14.0758C12.0429 16.1297 8.28914 16.1297 5.94958 14.0758C5.60371 13.7722 5.56948 13.2456 5.87311 12.8998Z" fill-rule="evenodd" clip-rule="evenodd" fill="white"/>
<path id="Ellipse 5" d="M7.83398 8.33203C7.83398 9.16046 7.16241 9.83203 6.33398 9.83203C5.50556 9.83203 4.83398 9.16046 4.83398 8.33203C4.83398 7.5036 5.50556 6.83203 6.33398 6.83203C7.16241 6.83203 7.83398 7.5036 7.83398 8.33203Z" fill="white"/>
<path id="Ellipse 6" d="M15.168 8.33203C15.168 9.16046 14.4964 9.83203 13.668 9.83203C12.8395 9.83203 12.168 9.16046 12.168 8.33203C12.168 7.5036 12.8395 6.83203 13.668 6.83203C14.4964 6.83203 15.168 7.5036 15.168 8.33203Z" fill="white"/>
</g>
</svg>
`;

export const volume = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="15.8765" height="12.4159" viewBox="0 0 15.8765 12.4159" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group Copy">
<path id="Path" d="M6.94131 0.564853C7.60547 0.116474 8.50085 0.59232 8.50085 1.39366V11.0214C8.50085 11.8228 7.60547 12.2986 6.94132 11.8502L3.54202 9.55533H2C0.895431 9.55533 0 8.6599 0 7.55533V4.85976C0 3.75519 0.895431 2.85977 2 2.85977H3.54202L6.94131 0.564853Z" fill="white"/>
<path id="Path_2" d="M10.6217 9.4919C11.5007 8.6462 12.0429 7.4867 12.0429 6.20751C12.0429 4.92295 11.4961 3.75909 10.6106 2.91248" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="white"/>
<path id="Path_3" d="M12.5941 1C14.0043 2.33283 14.8765 4.17411 14.8765 6.20793C14.8765 8.24175 14.0043 10.083 12.5941 11.4159" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="white"/>
</g>
</svg>
`;

export const giftRing = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="47.5602" height="44.5877" viewBox="0 0 47.5602 44.5877" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="stroke0_0_104" fill="white">
<path d="M47.5602 22.2938C47.5602 34.6064 36.9135 44.5877 23.7801 44.5877C10.6467 44.5877 0 34.6064 0 22.2938C0 9.9813 10.6467 0 23.7801 0C36.9135 0 47.5602 9.9813 47.5602 22.2938Z"/>
</mask>
<path id="Ellipse 56" d="M47.5602 22.2938C47.5602 34.6064 36.9135 44.5877 23.7801 44.5877C10.6467 44.5877 0 34.6064 0 22.2938C0 9.9813 10.6467 0 23.7801 0C36.9135 0 47.5602 9.9813 47.5602 22.2938Z" stroke-width="20" stroke="#C32FAE" mask="url(#stroke0_0_104)"/>
</svg>
`;

export const menu = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="53" height="53" viewBox="0 0 53 53" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group 1597881115">
<g id="Ellipse 63" opacity="0.2" filter="url(#filter0_d_0_97)">
<circle cx="26.5" cy="22.5" r="20.5" fill="black"/>
<circle cx="26.5" cy="22.5" r="20" stroke="#FFDE07"/>
</g>
<g id="menu-square">
<path id="Vector" d="M16 27.999C16 26.4586 16 25.6883 16.3467 25.1225C16.5407 24.8059 16.8069 24.5397 17.1235 24.3457C17.6893 23.999 18.4596 23.999 20 23.999C21.5404 23.999 22.3107 23.999 22.8765 24.3457C23.1931 24.5397 23.4593 24.8059 23.6533 25.1225C24 25.6883 24 26.4586 24 27.999C24 29.5394 24 30.3097 23.6533 30.8755C23.4593 31.1921 23.1931 31.4583 22.8765 31.6523C22.3107 31.999 21.5404 31.999 20 31.999C18.4596 31.999 17.6893 31.999 17.1235 31.6523C16.8069 31.4583 16.5407 31.1921 16.3467 30.8755C16 30.3097 16 29.5394 16 27.999Z" fill="white" stroke="white"/>
<path id="Vector_2" d="M28 27.999C28 26.4586 28 25.6883 28.3467 25.1225C28.5407 24.8059 28.8069 24.5397 29.1235 24.3457C29.6893 23.999 30.4596 23.999 32 23.999C33.5404 23.999 34.3107 23.999 34.8765 24.3457C35.1931 24.5397 35.4593 24.8059 35.6533 25.1225C36 25.6883 36 26.4586 36 27.999C36 29.5394 36 30.3097 35.6533 30.8755C35.4593 31.1921 35.1931 31.4583 34.8765 31.6523C34.3107 31.999 33.5404 31.999 32 31.999C30.4596 31.999 29.6893 31.999 29.1235 31.6523C28.8069 31.4583 28.5407 31.1921 28.3467 30.8755C28 30.3097 28 29.5394 28 27.999Z" fill="white" stroke="white"/>
<path id="Vector_3" d="M16 15.999C16 14.4586 16 13.6884 16.3467 13.1226C16.5407 12.806 16.8069 12.5398 17.1235 12.3458C17.6893 11.999 18.4596 11.999 20 11.999C21.5404 11.999 22.3107 11.999 22.8765 12.3458C23.1931 12.5398 23.4593 12.806 23.6533 13.1226C24 13.6884 24 14.4586 24 15.999C24 17.5395 24 18.3097 23.6533 18.8755C23.4593 19.1921 23.1931 19.4583 22.8765 19.6523C22.3107 19.999 21.5404 19.999 20 19.999C18.4596 19.999 17.6893 19.999 17.1235 19.6523C16.8069 19.4583 16.5407 19.1921 16.3467 18.8755C16 18.3097 16 17.5395 16 15.999Z" fill="#FFF8F8" stroke="white"/>
<path id="Vector_4" d="M28 15.999C28 14.4586 28 13.6884 28.3467 13.1226C28.5407 12.806 28.8069 12.5398 29.1235 12.3458C29.6893 11.999 30.4596 11.999 32 11.999C33.5404 11.999 34.3107 11.999 34.8765 12.3458C35.1931 12.5398 35.4593 12.806 35.6533 13.1226C36 13.6884 36 14.4586 36 15.999C36 17.5395 36 18.3097 35.6533 18.8755C35.4593 19.1921 35.1931 19.4583 34.8765 19.6523C34.3107 19.999 33.5404 19.999 32 19.999C30.4596 19.999 29.6893 19.999 29.1235 19.6523C28.8069 19.4583 28.5407 19.1921 28.3467 18.8755C28 18.3097 28 17.5395 28 15.999Z" fill="white" stroke="white"/>
</g>
</g>
<defs>
<filter id="filter0_d_0_97" x="0" y="0" width="53" height="53" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_97"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_97" result="shape"/>
</filter>
</defs>
</svg>
`;

export const flagIN = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="19" height="12" viewBox="0 0 19 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="flag/IN" clip-path="url(#clip0_0_89)">
<path id="Vector" d="M-4.19157 -3.42857H23.1916V15.4286H-4.19157V-3.42857Z" fill="#181A93"/>
<path id="Vector_2" d="M-5.18182 -3.42857H24.1818V2.85714H-5.18182V-3.42857Z" fill="#FFA44A"/>
<path id="Vector_3" d="M-5.18164 9.14258H24.182V15.4283H-5.18164V9.14258Z" fill="#1A9F0B"/>
<path id="Vector_4" d="M-5.18164 2.85742H24.182V9.14314H-5.18164V2.85742Z" fill="white"/>
<path id="Vector_5" d="M9.50054 7.88569C10.5817 7.88569 11.4581 7.04142 11.4581 5.99997C11.4581 4.95852 10.5817 4.11426 9.50054 4.11426C8.41941 4.11426 7.54297 4.95852 7.54297 5.99997C7.54297 7.04142 8.41941 7.88569 9.50054 7.88569Z" fill="white"/>
<path id="Vector_6" d="M9.50073 8.51441C8.06403 8.51441 6.89062 7.38409 6.89062 6.00013C6.89062 4.61617 8.06403 3.48584 9.50073 3.48584C10.9374 3.48584 12.1108 4.61617 12.1108 6.00013C12.1108 7.38409 10.9374 8.51441 9.50073 8.51441ZM9.50073 7.88584C10.5425 7.88584 11.4583 7.00363 11.4583 6.00013C11.4583 4.99662 10.5482 4.11441 9.50073 4.11441C8.45325 4.11441 7.54315 4.99662 7.54315 6.00013C7.54315 7.00363 8.45898 7.88584 9.50073 7.88584Z" fill="#181A93"/>
<path id="Vector_7" d="M9.50036 7.25696C10.2211 7.25696 10.8054 6.69412 10.8054 5.99982C10.8054 5.30552 10.2211 4.74268 9.50036 4.74268C8.7796 4.74268 8.19531 5.30552 8.19531 5.99982C8.19531 6.69412 8.7796 7.25696 9.50036 7.25696Z" fill="#181A93"/>
</g>
<defs>
<clipPath id="clip0_0_89">
<rect width="19" height="12" fill="white"/>
</clipPath>
</defs>
</svg>
`;

export const liveCount = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="51.1328" height="34" viewBox="0 0 51.1328 34" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="Union" d="M51.1328 34H18.8379V33.7627C17.9628 33.9173 17.0643 34 16.1475 34C7.22969 34 0 26.3888 0 17C0 7.61116 7.22969 0 16.1475 0C17.0642 2.35399e-05 17.9629 0.0817783 18.8379 0.236328V0H51.1328V34Z" fill="white" fill-opacity="0.32"/>
</svg>
`;

export const liveWave = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Vector">
<path d="M1 6.83333V10.1667ZM4.75 7.66667V9.33333ZM8.5 3.5V13.5ZM12.25 1V16ZM16 6.83333V10.1667Z" fill="black"/>
<path d="M1 6.83333V10.1667M4.75 7.66667V9.33333M8.5 3.5V13.5M12.25 1V16M16 6.83333V10.1667" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolBrush = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="paintbrush">
<path id="Vector" d="M14.622 17.8966L3.94202 14.9836M8.99998 7.99976C7.19598 10.7098 5.02998 11.4598 2.41698 11.9478C2.3303 11.9636 2.24924 12.0017 2.18179 12.0584C2.11434 12.1151 2.06283 12.1884 2.03235 12.2711C2.00186 12.3538 1.99345 12.443 2.00794 12.5299C2.02243 12.6168 2.05932 12.6984 2.11498 12.7668L9.43498 21.6498C9.58366 21.8077 9.77965 21.913 9.9934 21.9498C10.2071 21.9866 10.4271 21.9529 10.62 21.8538C12.735 20.4048 16 16.7918 16 14.9998M18.376 2.62173C18.5731 2.42462 18.8071 2.26826 19.0646 2.16158C19.3222 2.05491 19.5982 2 19.877 2C20.1557 2 20.4318 2.05491 20.6893 2.16158C20.9469 2.26826 21.1809 2.42462 21.378 2.62173C21.5751 2.81885 21.7314 3.05286 21.8381 3.3104C21.9448 3.56794 21.9997 3.84397 21.9997 4.12273C21.9997 4.4015 21.9448 4.67753 21.8381 4.93507C21.7314 5.19261 21.5751 5.42662 21.378 5.62373L17.36 9.64273C17.2662 9.7365 17.2136 9.86365 17.2136 9.99623C17.2136 10.1288 17.2662 10.256 17.36 10.3497L18.304 11.2937C18.7559 11.7457 19.0097 12.3586 19.0097 12.9977C19.0097 13.6368 18.7559 14.2498 18.304 14.7017L17.36 15.6457C17.2662 15.7395 17.1391 15.7921 17.0065 15.7921C16.8739 15.7921 16.7467 15.7395 16.653 15.6457L8.35397 7.34773C8.26024 7.25397 8.20758 7.12682 8.20758 6.99424C8.20758 6.86165 8.26024 6.7345 8.35397 6.64073L9.29797 5.69673C9.74993 5.24485 10.3629 4.99099 11.002 4.99099C11.6411 4.99099 12.254 5.24485 12.706 5.69673L13.65 6.64073C13.7437 6.73447 13.8709 6.78713 14.0035 6.78713C14.1361 6.78713 14.2632 6.73447 14.357 6.64073L18.376 2.62173Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolTheme = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="wallpaper">
<path id="Vector" d="M13.5 25.5L22.65 16.35C23.2134 15.7978 23.9717 15.4897 24.7606 15.4925C25.5495 15.4954 26.3055 15.8088 26.865 16.365L33 22.5M33 22.5V7.5C33 6.70435 32.6839 5.94129 32.1213 5.37868C31.5587 4.81607 30.7956 4.5 30 4.5H6C5.20435 4.5 4.44129 4.81607 3.87868 5.37868C3.31607 5.94129 3 6.70435 3 7.5V22.5C3 23.2956 3.31607 24.0587 3.87868 24.6213C4.44129 25.1839 5.20435 25.5 6 25.5H30C30.7956 25.5 31.5587 25.1839 32.1213 24.6213C32.6839 24.0587 33 23.2956 33 22.5ZM12 31.5H24M18 25.5V31.5M15 13.5C15 15.1569 13.6569 16.5 12 16.5C10.3431 16.5 9 15.1569 9 13.5C9 11.8431 10.3431 10.5 12 10.5C13.6569 10.5 15 11.8431 15 13.5Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolSound = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="sliders-horizontal">
<path id="Vector" d="M34.125 6.5H22.75M22.75 6.5V3.25M22.75 6.5V9.75M16.25 6.5H4.875M34.125 19.5H19.5M13 19.5H4.875M13 19.5V16.25M13 19.5V22.75M34.125 32.5H26M26 32.5V29.25M26 32.5V35.75M19.5 32.5H4.875" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolMusic = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="music-4">
<path id="Vector" d="M13.5 27V7.5L31.5 4.5V24M13.5 27C13.5 29.4853 11.4853 31.5 9 31.5C6.51472 31.5 4.5 29.4853 4.5 27C4.5 24.5147 6.51472 22.5 9 22.5C11.4853 22.5 13.5 24.5147 13.5 27ZM31.5 24C31.5 26.4853 29.4853 28.5 27 28.5C24.5147 28.5 22.5 26.4853 22.5 24C22.5 21.5147 24.5147 19.5 27 19.5C29.4853 19.5 31.5 21.5147 31.5 24ZM13.5 13.5L31.5 10.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolKick = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="log-out">
<path id="Vector" d="M24 10.5L31.5 18L24 25.5M31.5 18H13.5M13.5 31.5H7.5C6.70435 31.5 5.94129 31.1839 5.37868 30.6213C4.81607 30.0587 4.5 29.2956 4.5 28.5V7.5C4.5 6.70435 4.81607 5.94129 5.37868 5.37868C5.94129 4.81607 6.70435 4.5 7.5 4.5H13.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolMute = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="mic-off">
<path id="Vector" d="M3 3L33 33M28.335 19.845C28.4434 19.2359 28.4986 18.6186 28.5 18V15M7.50001 15V18C7.46949 20.0988 8.06869 22.1585 9.22026 23.9133C10.3718 25.6682 12.0229 27.0377 13.9604 27.845C15.898 28.6523 18.033 28.8603 20.0899 28.4424C22.1468 28.0244 24.0313 26.9995 25.5 25.5M22.4999 14.01V7.49999C22.4938 6.48954 22.1478 5.51055 21.5177 4.72067C20.8875 3.93079 20.0098 3.37599 19.0259 3.14562C18.0421 2.91524 17.0093 3.0227 16.094 3.45069C15.1786 3.87868 14.434 4.60229 13.9799 5.50499M13.5 13.5V18C13.5008 18.8894 13.7651 19.7587 14.2596 20.498C14.7542 21.2373 15.4567 21.8135 16.2785 22.1537C17.1002 22.494 18.0044 22.5831 18.8768 22.4098C19.7492 22.2365 20.5507 21.8085 21.18 21.18M18 28.5V33" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const toolLock = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="lock-keyhole">
<path id="Vector" d="M7 10V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V10M13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15C12.5523 15 13 15.4477 13 16ZM5 10H19C20.1046 10 21 10.8954 21 12V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V12C3 10.8954 3.89543 10 5 10Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const redPacketShine = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="76" height="79" viewBox="0 0 76 79" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Ellipse 1985">
<path d="M76 39.5C76 61.3152 58.9868 79 38 79C17.0132 79 0 61.3152 0 39.5C0 17.6848 17.0132 0 38 0C58.9868 0 76 17.6848 76 39.5Z" fill="url(#paint0_linear_0_21)"/>
<mask id="stroke0_0_21" fill="white">
<path d="M76 39.5C76 61.3152 58.9868 79 38 79C17.0132 79 0 61.3152 0 39.5C0 17.6848 17.0132 0 38 0C58.9868 0 76 17.6848 76 39.5Z"/>
</mask>
<path d="M76 39.5C76 61.3152 58.9868 79 38 79C17.0132 79 0 61.3152 0 39.5C0 17.6848 17.0132 0 38 0C58.9868 0 76 17.6848 76 39.5Z" stroke-width="4" stroke="#FEDE0F" mask="url(#stroke0_0_21)"/>
</g>
<defs>
<linearGradient id="paint0_linear_0_21" x1="-2.78635e-07" y1="17.2471" x2="75.7428" y2="62.1864" gradientUnits="userSpaceOnUse">
<stop stop-color="#FF8B25"/>
<stop offset="1" stop-color="#EB11AA"/>
</linearGradient>
</defs>
</svg>
`;

export const close = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="x" opacity="0.5">
<path id="Vector" d="M20.25 6.75L6.75 20.25M6.75 6.75L20.25 20.25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const check = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="check">
<path id="Vector" d="M11.6673 3.5L5.25065 9.91667L2.33398 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="white"/>
</g>
</svg>
`;

export const radioOff = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Ellipse 107">
<circle cx="15" cy="15" r="15" fill="white"/>
<circle cx="15" cy="15" r="14.5" stroke="black" stroke-opacity="0.22"/>
</g>
</svg>
`;

export const radioOn = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle id="Ellipse 107" cx="15" cy="15" r="15" fill="#00B3FF"/>
</svg>
`;

export const search = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="search">
<path id="Vector" d="M18.375 18.375L14.6125 14.6125M16.625 9.625C16.625 13.491 13.491 16.625 9.625 16.625C5.75901 16.625 2.625 13.491 2.625 9.625C2.625 5.75901 5.75901 2.625 9.625 2.625C13.491 2.625 16.625 5.75901 16.625 9.625Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="#7C7979"/>
</g>
</svg>
`;

/** Create Room (397:2807 / 397:2856) — the cover box's camera and the background row's plus. */
export const camera = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="camera">
<path id="Vector" d="M27.7917 7.66667H18.2083L13.4167 13.4167H7.66667C6.65 13.4167 5.67498 13.8205 4.95609 14.5394C4.2372 15.2583 3.83333 16.2333 3.83333 17.25V34.5C3.83333 35.5167 4.2372 36.4917 4.95609 37.2106C5.67498 37.9295 6.65 38.3333 7.66667 38.3333H38.3333C39.35 38.3333 40.325 37.9295 41.0439 37.2106C41.7628 36.4917 42.1667 35.5167 42.1667 34.5V17.25C42.1667 16.2333 41.7628 15.2583 41.0439 14.5394C40.325 13.8205 39.35 13.4167 38.3333 13.4167H32.5833L27.7917 7.66667ZM28.75 24.9167C28.75 28.0923 26.1756 30.6667 23 30.6667C19.8244 30.6667 17.25 28.0923 17.25 24.9167C17.25 21.741 19.8244 19.1667 23 19.1667C26.1756 19.1667 28.75 21.741 28.75 24.9167Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="black"/>
</g>
</svg>
`;

export const plus = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="text/plus">
<path id="transfer" d="M10.75 2V9.75H3V12.3333H10.75V20.0833H13.3333V12.3333H21.0833V9.75H13.3333V2H10.75Z" fill="#BD8AB0"/>
</g>
</svg>
`;
