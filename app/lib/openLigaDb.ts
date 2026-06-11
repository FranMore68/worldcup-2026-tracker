"use server";

export interface OpenLigaTeam {
  teamId: number;
  teamName: string;
  shortName: string;
  teamIconUrl: string | null;
  teamGroupName: string | null;
}

export interface OpenLigaGoal {
  goalID: number;
  scoreTeam1: number;
  scoreTeam2: number;
  matchMinute: number | null;
  goalGetterID: number;
  goalGetterName: string;
  isPenalty: boolean;
  isOwnGoal: boolean;
  isOvertime: boolean;
  comment: string | null;
}

export interface OpenLigaResult {
  resultID: number;
  resultName: string;
  pointsTeam1: number;
  pointsTeam2: number;
  resultOrderID: number;
  // 1 = halftime, 2 = final result
  resultTypeID: number;
  resultDescription: string | null;
}

export interface OpenLigaLocation {
  locationID: number | null;
  locationCity: string | null;
  locationStadium: string | null;
}

export interface OpenLigaMatch {
  matchID: number;
  matchDateTime: string;
  matchDateTimeUTC: string;
  timeZoneID: string;
  leagueId: number;
  leagueName: string;
  leagueSeason: number;
  leagueShortcut: string;
  group: {
    groupName: string;
    groupOrderID: number;
    groupID: number;
  };
  team1: OpenLigaTeam;
  team2: OpenLigaTeam;
  matchIsFinished: boolean;
  matchResults: OpenLigaResult[];
  goals: OpenLigaGoal[];
  location: OpenLigaLocation | null;
  numberOfViewers: number | null;
  lastUpdateDateTime: string | null;
}

export async function getOpenLigaMatches(season: number = 2026): Promise<OpenLigaMatch[]> {
  let allMatches: OpenLigaMatch[] = [];

  // Try full season fetch first
  const resAll = await fetch(`https://api.openligadb.de/getmatchdata/wm26/${season}`, {
    next: { revalidate: 0 },
  });

  if (resAll.ok) {
    const data = (await resAll.json()) as OpenLigaMatch[];
    if (Array.isArray(data) && data.length > 0) {
      allMatches = data;
    }
  }

  // Fallback: iterate matchdays
  if (allMatches.length === 0) {
    for (let matchday = 1; matchday <= 20; matchday++) {
      const res = await fetch(`https://api.openligadb.de/getmatchdata/wm26/${season}/${matchday}`, {
        next: { revalidate: 0 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as OpenLigaMatch[];
      if (!Array.isArray(data) || data.length === 0) break;
      allMatches.push(...data);
    }
  }

  return allMatches;
}
