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
    label: "Warm (hell)",
    backgroundClass:
      "bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.18),transparent_40%),radial-gradient(circle_at_88%_6%,rgba(96,165,250,0.16),transparent_38%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]",
    honeycombClass: "hex-honeycomb-bg",
    honeycombOpacityClass: "opacity-[0.1]",
  },
  midnight: {
    key: "midnight",
    label: "Slate (dunkel)",
    backgroundClass:
      "bg-[radial-gradient(circle_at_15%_0%,rgba(251,146,60,0.12),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(59,130,246,0.12),transparent_32%),linear-gradient(180deg,#f6f8ff_0%,#edf2ff_100%)]",
    honeycombClass: "hex-honeycomb-bg",
    honeycombOpacityClass: "opacity-[0.08]",
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


