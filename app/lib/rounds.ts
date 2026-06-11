// Knockout stage model for World Cup 2026 (48 teams).
// OpenLigaDB groupOrderID: 1-3 group stage, 4 Sechzehntelfinale (R32),
// 5 Achtelfinale (R16), 6 Viertelfinale (QF), 7 Halbfinale (SF), 8 Finale
// (the "Finale" matchday contains both the 3rd-place match and the final).

export type KnockoutStageKey = "R32" | "R16" | "QF" | "SF" | "TP" | "F";

export interface KnockoutStage {
  key: KnockoutStageKey;
  label: string;
  size: number;
}

export const KNOCKOUT_STAGES: KnockoutStage[] = [
  { key: "R32", label: "Setzens de final", size: 16 },
  { key: "R16", label: "Vuitens de final", size: 8 },
  { key: "QF", label: "Quarts de final", size: 4 },
  { key: "SF", label: "Semifinals", size: 2 },
  { key: "TP", label: "3r i 4t lloc", size: 1 },
  { key: "F", label: "Final", size: 1 },
];

const LABEL_TO_KEY = new Map<string, KnockoutStageKey>(
  KNOCKOUT_STAGES.map((s) => [s.label, s.key])
);

const ORDER_ID_TO_KEY: Record<number, KnockoutStageKey> = {
  4: "R32",
  5: "R16",
  6: "QF",
  7: "SF",
};

export function stageLabel(key: KnockoutStageKey): string {
  const stage = KNOCKOUT_STAGES.find((s) => s.key === key);
  return stage?.label ?? "";
}

function keyFromGermanName(name: string): KnockoutStageKey | null {
  const lower = name.toLowerCase();
  if (lower.includes("sechzehntel")) return "R32";
  if (lower.includes("achtel")) return "R16";
  if (lower.includes("viertel")) return "QF";
  if (lower.includes("halb")) return "SF";
  if (lower.includes("platz 3") || lower.includes("platz drei")) return "TP";
  if (lower.includes("final")) return "F";
  return null;
}

interface OpenLigaGroupInfo {
  groupName?: string;
  groupOrderID?: number;
}

/**
 * Classifies a fixture into a knockout stage, or null for group-stage matches.
 * Reads the canonical Catalan round label first, then falls back to the raw
 * OpenLigaDB payload (for rows synced before round labels were normalized).
 * The "Finale" matchday (orderID 8) holds two matches: the one with the latest
 * kickoff is the final, the other the 3rd-place match — pass `isLastOfFinalDay`
 * when known, otherwise it defaults to the final.
 */
export function getKnockoutStageKey(
  fixture: { round: string | null; raw_payload?: Record<string, unknown> | null },
  isLastOfFinalDay: boolean = true
): KnockoutStageKey | null {
  if (fixture.round) {
    const byLabel = LABEL_TO_KEY.get(fixture.round);
    if (byLabel) return byLabel;
    if (fixture.round.startsWith("Grup ")) return null;
  }

  const raw = fixture.raw_payload as
    | { original?: { group?: OpenLigaGroupInfo } }
    | undefined
    | null;
  const group = raw?.original?.group;
  if (!group) return null;

  const orderId = group.groupOrderID ?? 0;
  if (orderId >= 1 && orderId <= 3) return null;

  if (group.groupName) {
    const byName = keyFromGermanName(group.groupName);
    if (byName === "F") return isLastOfFinalDay ? "F" : "TP";
    if (byName) return byName;
  }

  const byOrder = ORDER_ID_TO_KEY[orderId];
  if (byOrder) return byOrder;
  if (orderId === 8) return isLastOfFinalDay ? "F" : "TP";
  return null;
}
