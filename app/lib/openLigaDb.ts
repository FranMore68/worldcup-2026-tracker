"use server";

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
  team1: {
    teamId: number;
    teamName: string;
    shortName: string;
    teamIconUrl: string | null;
    teamGroupName: string | null;
  };
  team2: {
    teamId: number;
    teamName: string;
    shortName: string;
    teamIconUrl: string | null;
    teamGroupName: string | null;
  };
  matchIsFinished: boolean;
  matchResults: Array<{
    resultName: string;
    pointsTeam1: number;
    pointsTeam2: number;
    resultTypeID: number;
    resultDescriptionID: number;
  }>;
  goals: Array<{
    goalID: number;
    scoreTeam1: number;
    scoreTeam2: number;
    matchMinute: number | null;
    isOwnGoal: boolean;
    isPenalty: boolean;
    playerName: string;
  }>;
  location: string | null;
  numberOfViewers: number | null;
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

export async function getOpenLigaLiveMatches(season: number = 2026): Promise<OpenLigaMatch[]> {
  const matches = await getOpenLigaMatches(season);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  return matches.filter((m) => {
    const matchDate = m.matchDateTimeUTC.split("T")[0];
    return matchDate === today;
  });
}
