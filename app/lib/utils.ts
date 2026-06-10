export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleString("ca-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ca-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
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

export function getTeamLogoFallback(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`;
}
