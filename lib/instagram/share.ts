export type InstagramDmFlow = "advisor_to_advisor" | "referrer_to_contact";

export type InstagramStoryVariant = "serious" | "motivating" | "premium";

type StoryCopy = {
  badge: string;
  headline: string;
  subline: string;
  microline: string;
};

const STORY_COPY: Record<InstagramStoryVariant, StoryCopy> = {
  serious: {
    badge: "Seriös",
    headline: "Gute Empfehlungen entstehen, wenn Vertrauen auf die richtigen Kontakte trifft.",
    subline: "Genau darauf lege ich gerade meinen Fokus.",
    microline: "Manchmal reicht ein Gespräch.",
  },
  motivating: {
    badge: "Chancen",
    headline: "Netzwerk in Momentum verwandeln.",
    subline: "Wenn Empfehlungen planbar werden, entsteht aus Kontakten echtes Wachstum.",
    microline: "Aufbau mit Richtung.",
  },
  premium: {
    badge: "Premium",
    headline: "Weniger Lärm. Mehr Wirkung.",
    subline: "Ein Setup für Berater, die Qualität, Status und Kontrolle verbinden.",
    microline: "Silent growth.",
  },
};

const STORY_VARIANTS: Array<{ value: InstagramStoryVariant; label: string }> = [
  { value: "serious", label: "Seriös (Business)" },
  { value: "motivating", label: "Motivierend (Chancen)" },
  { value: "premium", label: "Premium (Status)" },
];

export function getInstagramStoryVariants() {
  return STORY_VARIANTS;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapTextByLength(input: string, maxLen: number) {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen && current) {
      lines.push(current);
      current = word;
      continue;
    }
    current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function logoMarkup(
  logoHref: string | null | undefined,
  options?: { x?: number; y?: number; width?: number; height?: number; opacity?: number },
) {
  if (!logoHref) return "";
  const x = options?.x ?? 100;
  const y = options?.y ?? 128;
  const width = options?.width ?? 190;
  const height = options?.height ?? 54;
  const opacity = options?.opacity ?? 0.92;
  return `<image href="${escapeXml(logoHref)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet" opacity="${opacity}" />`;
}

export function getInstagramDmMessage(flow: InstagramDmFlow, link: string) {
  const safeLink = link.trim();
  if (flow === "advisor_to_advisor") {
    return `Ich baue gerade mein Empfehlungsprogramm mit Rewaro sauber auf. Wenn du sehen willst, wie das bei dir aussehen kann: ${safeLink}`;
  }
  return `Hi, falls das für dich passt: Über diesen Link kannst du ganz unkompliziert Kontakt aufnehmen: ${safeLink}`;
}

export function getInstagramStoryCopy(variant: InstagramStoryVariant) {
  return STORY_COPY[variant];
}

function renderSeriousBody(args: {
  headlineSvg: string;
  sublineSvg: string;
  badge: string;
  advisorName: string;
  shortLink: string;
  microline: string;
  logo: string;
}) {
  return `
  <defs>
    <linearGradient id="bg-serious" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14110f"/>
      <stop offset="58%" stop-color="#13100e"/>
      <stop offset="100%" stop-color="#161311"/>
    </linearGradient>
    <filter id="noise-serious">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <radialGradient id="warm-left-glow" cx="0.08" cy="0.86" r="0.56">
      <stop offset="0%" stop-color="#d6a85f" stop-opacity="0.18"/>
      <stop offset="58%" stop-color="#fb923c" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="warm-mid-lift" cx="0.44" cy="0.58" r="0.56">
      <stop offset="0%" stop-color="#f4b26d" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#f4b26d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="line-serious-top" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0"/>
      <stop offset="42%" stop-color="#fb923c" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="line-serious-mid" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0"/>
      <stop offset="58%" stop-color="#fdba74" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="line-serious-low" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0"/>
      <stop offset="52%" stop-color="#fb923c" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg-serious)"/>
  <rect width="1080" height="1920" fill="url(#warm-left-glow)"/>
  <rect width="1080" height="1920" fill="url(#warm-mid-lift)"/>
  <rect width="1080" height="1920" filter="url(#noise-serious)" opacity="0.025"/>
  <rect x="88" y="136" width="904" height="1.5" fill="url(#line-serious-top)"/>
  <rect x="88" y="238" width="700" height="1.2" fill="url(#line-serious-mid)"/>
  <rect x="340" y="1362" width="652" height="1.2" fill="url(#line-serious-low)"/>
  <line x1="766" y1="286" x2="1002" y2="118" stroke="#fb923c" stroke-opacity="0.09" stroke-width="1.1"/>
  <line x1="108" y1="1528" x2="332" y2="1398" stroke="#fdba74" stroke-opacity="0.08" stroke-width="1.1"/>
  <text x="116" y="478" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="70" font-weight="730" letter-spacing="-0.72" fill="#f2f2f2">
    <tspan x="116" dy="0">Gute Empfehlungen entstehen,</tspan>
    <tspan x="116" dy="84">wenn Vertrauen auf die richtigen Kontakte trifft.</tspan>
  </text>
  <text x="116" y="760" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="40" font-weight="470" fill="#cfc7bd">
    <tspan x="116" dy="0">Genau darauf lege ich gerade meinen Fokus.</tspan>
  </text>
  <text x="116" y="940" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="36" font-weight="540" fill="#efebe7">– ${escapeXml(
    args.advisorName,
  )}</text>
  <text x="116" y="1002" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="21" font-weight="420" fill="#a89c8e">Manchmal reicht ein Gespräch.</text>
  `;
}

function renderMotivatingBody(args: {
  headlineSvg: string;
  sublineSvg: string;
  badge: string;
  advisorName: string;
  shortLink: string;
  microline: string;
  logo: string;
}) {
  return `
  <defs>
    <linearGradient id="bg-motivating" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#100d12"/>
      <stop offset="60%" stop-color="#1a1415"/>
      <stop offset="100%" stop-color="#241712"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0"/>
      <stop offset="50%" stop-color="#fb923c" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow-motivation" cx="0.85" cy="0.12" r="0.6">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg-motivating)"/>
  <rect width="1080" height="1920" fill="url(#glow-motivation)"/>
  <rect x="80" y="154" width="920" height="3" fill="url(#beam)"/>
  <rect x="80" y="1260" width="920" height="2" fill="url(#beam)"/>
  <rect x="96" y="220" rx="26" ry="26" width="246" height="66" fill="#f97316" fill-opacity="0.18" stroke="#fdba74" stroke-opacity="0.62"/>
  <text x="219" y="262" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="29" font-weight="700" letter-spacing="1.8" fill="#fdba74">${escapeXml(
    args.badge.toUpperCase(),
  )}</text>
  <text x="96" y="450" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="74" font-weight="820" letter-spacing="-1" fill="#f8fafc">${args.headlineSvg}</text>
  <text x="96" y="655" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="42" font-weight="520" fill="#e4e4e7">${args.sublineSvg}</text>
  <rect x="96" y="842" rx="30" ry="30" width="888" height="316" fill="#ffffff" fill-opacity="0.04" stroke="#fdba74" stroke-opacity="0.35"/>
  <text x="146" y="934" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="56" font-weight="760" fill="#fff7ed">${escapeXml(
    args.advisorName,
  )}</text>
  <text x="146" y="996" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="30" font-weight="560" fill="#fed7aa">${escapeXml(
    args.microline,
  )}</text>
  <text x="146" y="1062" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="24" font-weight="520" fill="#fde68a">Früh sichtbar. Klar aufgestellt.</text>
  <rect x="96" y="1630" rx="30" ry="30" width="888" height="178" fill="#ffffff" fill-opacity="0.04" stroke="#fdba74" stroke-opacity="0.34"/>
  <text x="146" y="1708" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="24" font-weight="640" fill="#fdba74">Direkter Einladungslink</text>
  <text x="146" y="1762" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="22" font-weight="520" fill="#fff7ed">${escapeXml(
    args.shortLink,
  )}</text>
  `;
}

function renderPremiumBody(args: {
  headlineSvg: string;
  sublineSvg: string;
  badge: string;
  advisorName: string;
  shortLink: string;
  microline: string;
  logo: string;
}) {
  return `
  <defs>
    <linearGradient id="bg-premium" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070708"/>
      <stop offset="100%" stop-color="#0d0d10"/>
    </linearGradient>
    <radialGradient id="halo-premium" cx="0.5" cy="0.1" r="0.65">
      <stop offset="0%" stop-color="#fde68a" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#fde68a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg-premium)"/>
  <rect width="1080" height="1920" fill="url(#halo-premium)"/>
  <rect x="84" y="124" width="912" height="1.5" fill="#fdba74" fill-opacity="0.4"/>
  <rect x="96" y="230" rx="28" ry="28" width="236" height="66" fill="#f59e0b" fill-opacity="0.12" stroke="#fcd34d" stroke-opacity="0.45"/>
  <text x="214" y="272" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="28" font-weight="640" letter-spacing="2.2" fill="#fcd34d">${escapeXml(
    args.badge.toUpperCase(),
  )}</text>
  <text x="96" y="456" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="78" font-weight="720" letter-spacing="-1.1" fill="#fafafa">${args.headlineSvg}</text>
  <text x="96" y="670" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="41" font-weight="480" fill="#d4d4d8">${args.sublineSvg}</text>
  <rect x="96" y="846" rx="34" ry="34" width="888" height="296" fill="#ffffff" fill-opacity="0.025" stroke="#fcd34d" stroke-opacity="0.22"/>
  <text x="146" y="934" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="54" font-weight="680" fill="#f5f5f5">${escapeXml(
    args.advisorName,
  )}</text>
  <text x="146" y="996" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="29" font-weight="500" fill="#e4e4e7">${escapeXml(
    args.microline,
  )}</text>
  <text x="146" y="1060" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="22" font-weight="500" fill="#fcd34d">Struktur mit Anspruch.</text>
  <rect x="96" y="1638" rx="34" ry="34" width="888" height="166" fill="#ffffff" fill-opacity="0.025" stroke="#fcd34d" stroke-opacity="0.22"/>
  <text x="146" y="1712" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="23" font-weight="600" fill="#fcd34d">Einladung im direkten Austausch</text>
  <text x="146" y="1762" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="22" font-weight="500" fill="#f5f5f5">${escapeXml(
    args.shortLink,
  )}</text>
  `;
}

export function buildInstagramStorySvg(input: {
  variant: InstagramStoryVariant;
  advisorName: string;
  inviteLink: string;
  logoHref?: string | null;
}) {
  const copy = getInstagramStoryCopy(input.variant);
  const advisorName = input.advisorName.trim() || "Berater";
  const shortLink = input.inviteLink.trim();
  const headlineLines = wrapTextByLength(copy.headline, 28);
  const sublineLines = wrapTextByLength(copy.subline, 42);
  const logo = "";

  const headlineSvg = headlineLines
    .map(
      (line, index) =>
        `<tspan x="96" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const sublineSvg = sublineLines
    .map(
      (line, index) =>
        `<tspan x="96" dy="${index === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const renderArgs = {
    headlineSvg,
    sublineSvg,
    badge: copy.badge,
    advisorName,
    shortLink,
    microline: copy.microline,
    logo,
  };

  const body =
    input.variant === "serious"
      ? renderSeriousBody(renderArgs)
      : input.variant === "motivating"
        ? renderMotivatingBody(renderArgs)
        : renderPremiumBody(renderArgs);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  ${body}
</svg>`;
}
