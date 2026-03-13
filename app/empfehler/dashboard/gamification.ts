import type { Reward, Referral, PointsTransaction } from "@/lib/types/domain";

export type ReferrerLevel = {
  key: "none" | "bronze" | "silber" | "gold" | "platin";
  label: "Kein Titel" | "Bronze" | "Silber" | "Gold" | "Platin";
  minPoints: number;
};

export type LevelThresholds = {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
};

const defaultThresholds: LevelThresholds = {
  bronze: 100,
  silver: 200,
  gold: 500,
  platinum: 1000,
};

function getLevels(thresholds?: Partial<LevelThresholds>) {
  const bronze = thresholds?.bronze ?? defaultThresholds.bronze;
  const silver = thresholds?.silver ?? defaultThresholds.silver;
  const gold = thresholds?.gold ?? defaultThresholds.gold;
  const platinum = thresholds?.platinum ?? defaultThresholds.platinum;

  return [
    { key: "none", label: "Kein Titel", minPoints: 0 },
    { key: "bronze", label: "Bronze", minPoints: bronze },
    { key: "silber", label: "Silber", minPoints: silver },
    { key: "gold", label: "Gold", minPoints: gold },
    { key: "platin", label: "Platin", minPoints: platinum },
  ] as ReferrerLevel[];
}

export function getCurrentLevel(points: number, thresholds?: Partial<LevelThresholds>) {
  const levels = getLevels(thresholds);
  let current = levels[0];
  for (const level of levels) {
    if (points >= level.minPoints) {
      current = level;
    }
  }
  return current;
}

export function getNextLevel(points: number, thresholds?: Partial<LevelThresholds>) {
  const levels = getLevels(thresholds);
  return levels.find((level) => level.minPoints > points) ?? null;
}

export function getLevelProgress(
  points: number,
  thresholds?: Partial<LevelThresholds>,
) {
  const current = getCurrentLevel(points, thresholds);
  const next = getNextLevel(points, thresholds);

  if (!next) {
    return {
      current,
      next: null,
      progressPercent: 100,
      pointsInCurrentLevel: points - current.minPoints,
      pointsNeededInLevel: 0,
      pointsToNextLevel: 0,
    };
  }

  const span = next.minPoints - current.minPoints;
  const inLevel = Math.max(0, points - current.minPoints);
  const percent = span <= 0 ? 100 : Math.min(100, Math.round((inLevel / span) * 100));

  return {
    current,
    next,
    progressPercent: percent,
    pointsInCurrentLevel: inLevel,
    pointsNeededInLevel: span,
    pointsToNextLevel: Math.max(0, next.minPoints - points),
  };
}

export function getNextReward(rewards: Reward[], points: number) {
  const sorted = [...rewards].sort((a, b) => a.points_cost - b.points_cost);
  const next = sorted.find((reward) => reward.points_cost > points) ?? null;
  const highestReached = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  if (next) {
    return {
      reward: next,
      pointsMissing: next.points_cost - points,
      progressPercent:
        next.points_cost <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((points / next.points_cost) * 100))),
    };
  }

  if (highestReached) {
    return {
      reward: highestReached,
      pointsMissing: 0,
      progressPercent: 100,
    };
  }

  return null;
}

export function mapReferralStatusToUi(status: Referral["status"]) {
  switch (status) {
    case "neu":
      return "eingereicht";
    case "kontaktiert":
    case "termin":
      return "in Pruefung";
    case "abschluss":
      return "erfolgreich";
    case "abgelehnt":
      return "abgelehnt";
    default:
      return status;
  }
}

export function getAwardedPointsByReferral(pointsRows: PointsTransaction[]) {
  const awarded = new Map<string, number>();
  for (const row of pointsRows) {
    if (row.transaction_type !== "earn_referral_close") continue;
    if (!row.referral_id) continue;
    if (awarded.has(row.referral_id)) continue;
    awarded.set(row.referral_id, row.points);
  }
  return awarded;
}

export function buildMotivationHints(params: {
  pointsBalance: number;
  successfulReferralsCount: number;
  pointsToNextLevel: number;
  pointsToNextReward: number | null;
}) {
  const hints: string[] = [];

  if (params.pointsToNextReward !== null && params.pointsToNextReward > 0) {
    hints.push(
      `Du bist nur noch ${params.pointsToNextReward} Punkte von deiner naechsten Belohnung entfernt.`,
    );
  }

  if (params.successfulReferralsCount > 0) {
    hints.push(
      `Stark! Du hast bereits ${params.successfulReferralsCount} erfolgreiche Empfehlungen gesammelt.`,
    );
  }

  if (params.pointsToNextLevel > 0) {
    hints.push(`Noch ${params.pointsToNextLevel} Punkte bis zum naechsten Level.`);
  } else {
    hints.push("Top Leistung! Du hast bereits das hoechste Level erreicht.");
  }

  if (hints.length === 0 && params.pointsBalance === 0) {
    hints.push(
      "Sobald eine Empfehlung erfolgreich abgeschlossen ist, siehst du hier deine ersten Fortschritte.",
    );
  }

  return hints.slice(0, 3);
}
