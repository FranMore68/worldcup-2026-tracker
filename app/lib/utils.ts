export const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"] as const;
export const LIVE_STATUSES = ["LIV", "HT", "BT", "1H", "2H", "ET", "P"] as const;

export function isFinishedStatus(status: string): boolean {
  return (FINISHED_STATUSES as readonly string[]).includes(status);
}

export function isLiveStatus(status: string): boolean {
  return (LIVE_STATUSES as readonly string[]).includes(status);
}

// Progression rank of a match status: not-started < live < finished. Used by the
// sync jobs to never downgrade a fixture (e.g. OpenLigaDB lagging behind FIFA
// must not revert a live/finished match back to "not started").
export function statusRank(status: string): number {
  if (isFinishedStatus(status)) return 2;
  if (isLiveStatus(status)) return 1;
  return 0;
}

export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleString("ca-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ca-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Madrid",
  });
}

export function formatTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export function formatMatchStatus(status: string): string {
  const statusMap: Record<string, string> = {
    NS: "No començat",
    TBD: "Per determinar",
    LIV: "En directe",
    HT: "Descans",
    FT: "Finalitzat",
    AET: "Després de pròrroga",
    PEN: "Penals",
    BT: "Descans (pròrroga)",
    PST: "Ajornat",
    CANC: "Cancel·lat",
    ABD: "Abandonat",
    AWD: "Adjudicat",
    WO: "Walkover",
  };
  return statusMap[status] ?? status;
}

export function formatGroupName(group: string): string {
  return group.replace("Group ", "Grup ");
}

export function formatRound(round: string | null): string {
  if (!round) return "";
  return round.replace("Group ", "Grup ");
}

export function getTeamLogoFallback(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`;
}
