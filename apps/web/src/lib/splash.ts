/**
 * iPhone launch screens. iOS shows one of these while an installed app starts, chosen by the phone's
 * own size (it ignores anything that does not match exactly), so each size has its own picture.
 * `scripts/generate-icons.py` makes the pictures from the logo; keep its list the same as this one
 * (src/app/splash.test.ts checks every file here exists at the right size).
 */
export type Splash = Readonly<{ width: number; height: number; ratio: 2 | 3 }>;

export const SPLASH: readonly Splash[] = [
  { width: 750, height: 1334, ratio: 2 }, // SE (2nd, 3rd gen), 8
  { width: 828, height: 1792, ratio: 2 }, // XR, 11
  { width: 1125, height: 2436, ratio: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { width: 1170, height: 2532, ratio: 3 }, // 12, 13, 14, 12 Pro, 13 Pro
  { width: 1179, height: 2556, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 1206, height: 2622, ratio: 3 }, // 16 Pro
  { width: 1242, height: 2208, ratio: 3 }, // 6 Plus, 7 Plus, 8 Plus
  { width: 1242, height: 2688, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 1284, height: 2778, ratio: 3 }, // 12, 13 Pro Max, 14 Plus
  { width: 1290, height: 2796, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { width: 1320, height: 2868, ratio: 3 }, // 16 Pro Max
];

export const splashFile = (s: Splash) => `/splash/ios-${s.width}x${s.height}.png`;

/** The media query iOS matches: the screen's size in CSS pixels, its density, and upright. */
export const splashMedia = (s: Splash) =>
  `(device-width: ${s.width / s.ratio}px) and (device-height: ${s.height / s.ratio}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`;
