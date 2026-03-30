export type WhatsAppShareFlow =
  | "advisor_to_advisor"
  | "advisor_to_referrer"
  | "referrer_to_contact";

function encodeMessage(message: string) {
  return encodeURIComponent(message.trim());
}

export function buildWhatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeMessage(message)}`;
}

export function getWhatsAppShareMessage(
  flow: WhatsAppShareFlow,
  link: string,
) {
  const safeLink = link.trim();
  if (flow === "advisor_to_advisor") {
    return `Ich nutze gerade Rewaro für mein Empfehlungsprogramm. Wenn du dir das mal anschauen willst, hier ist mein Link: ${safeLink}`;
  }
  if (flow === "advisor_to_referrer") {
    return `Ich nutze Rewaro, um Empfehlungen einfacher zu organisieren. Wenn du dabei mitmachen möchtest, kannst du hier direkt einsteigen: ${safeLink}`;
  }
  return `Falls das für dich interessant ist, kannst du hier ganz unkompliziert Kontakt aufnehmen: ${safeLink}`;
}

export function buildWhatsAppShareUrlForFlow(
  flow: WhatsAppShareFlow,
  link: string,
) {
  return buildWhatsAppShareUrl(getWhatsAppShareMessage(flow, link));
}
