export type ReferrerThemeKey = "lila" | "midnight";

type ReferrerThemeConfig = {
  key: ReferrerThemeKey;
  label: string;
  backgroundClass: string;
  honeycombClass: string;
  honeycombOpacityClass: string;
};

const referrerThemes: Record<ReferrerThemeKey, ReferrerThemeConfig> = {
  lila: {
    key: "lila",
    label: "Lila (heller)",
    backgroundClass:
      "bg-[radial-gradient(circle_at_15%_0%,rgba(158,116,255,0.34),transparent_38%),radial-gradient(circle_at_85%_8%,rgba(191,154,255,0.28),transparent_36%),linear-gradient(180deg,#26183f_0%,#1d1232_100%)]",
    honeycombClass: "hex-honeycomb-bg-referrer",
    honeycombOpacityClass: "opacity-40",
  },
  midnight: {
    key: "midnight",
    label: "Midnight (dunkler)",
    backgroundClass:
      "bg-[radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.24),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_32%),linear-gradient(180deg,#150d24_0%,#120a1f_100%)]",
    honeycombClass: "hex-honeycomb-bg",
    honeycombOpacityClass: "opacity-22",
  },
};

export const referrerThemeOptions = Object.values(referrerThemes).map((theme) => ({
  key: theme.key,
  label: theme.label,
}));

export function getReferrerTheme(value: unknown): ReferrerThemeConfig {
  if (value === "midnight") return referrerThemes.midnight;
  return referrerThemes.lila;
}

