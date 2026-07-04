// Client for the public (undocumented) FIFA.com API. No key required.
// Used as an enrichment layer on top of OpenLigaDB: squads, coaches, cards,
// substitutions, stadiums, referees and attendance. If FIFA changes or blocks
// this API, the app keeps working with OpenLigaDB data only.

const FIFA_API = "https://api.fifa.com/api/v3";

// Knockout stage IDs from FIFA.com for the 2026 World Cup.
// Stage 289273 = groups; 289287-289292 = R32, R16, QF, SF, TP, F.
export const FIFA_STAGE_ORDER: Record<string, number> = {
  "289273": 0, // group stage (ignored for knockout creation)
  "289287": 4, // round of 32
  "289288": 5, // round of 16
  "289289": 6, // quarter-finals
  "289290": 7, // semi-finals
  "289291": 8, // third-place playoff
  "289292": 8, // final (same matchday as third place)
};

export const FIFA_KNOCKOUT_STAGES = ["289287", "289288", "289289", "289290", "289291", "289292"];

// Men's FIFA World Cup; season id for the 2026 edition (verified June 2026).
export const FIFA_COMPETITION = "17";
export const FIFA_SEASON = "285023";

interface LocalizedName {
  Locale: string;
  Description: string;
}

export interface FifaTeamSide {
  IdTeam: string | null;
  Score: number | null;
  Abbreviation: string | null;
  TeamName: LocalizedName[] | null;
}

export interface FifaStadium {
  Name: LocalizedName[] | null;
  CityName: LocalizedName[] | null;
}

export interface FifaOfficial {
  OfficialId: string;
  OfficialType?: number;
  NameShort: LocalizedName[] | null;
}

export interface FifaCalendarMatch {
  IdMatch: string;
  IdStage: string;
  Date: string;
  MatchStatus: number;
  Home: FifaTeamSide | null;
  Away: FifaTeamSide | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  HomeTeamPenaltyScore: number | null;
  AwayTeamPenaltyScore: number | null;
  Stadium: FifaStadium | null;
  Officials: FifaOfficial[] | null;
  Attendance: string | number | null;
}

export interface FifaLivePlayer {
  IdPlayer: string;
  ShirtNumber: number | null;
  // 0 = goalkeeper, 1 = defender, 2 = midfielder, 3 = forward
  Position: number | null;
  // 1 = starter, 2 = substitute (bench)
  Status: number | null;
  PlayerName: LocalizedName[] | null;
}

export interface FifaLiveCoach {
  IdCoach: string | null;
  Role: number | null;
  Name: LocalizedName[] | null;
}

export interface FifaLiveTeam {
  IdTeam: string | null;
  Score: number | null;
  Players: FifaLivePlayer[] | null;
  Coaches: FifaLiveCoach[] | null;
}

export interface FifaLiveMatch {
  IdMatch: string;
  MatchStatus: number;
  Attendance: string | number | null;
  HomeTeam: FifaLiveTeam | null;
  AwayTeam: FifaLiveTeam | null;
  Officials: FifaOfficial[] | null;
  Stadium: FifaStadium | null;
}

export interface FifaTimelineEvent {
  // 0 = goal, 2 = yellow card, 3 = red card, 4 = second yellow, 5 = substitution,
  // 41 = penalty shootout goal, 60 = penalty shootout miss. Period 11 = shootout.
  Type: number;
  MatchMinute: string | null;
  IdTeam: string | null;
  IdPlayer: string | null;
  IdSubPlayer: string | null;
  Period: number | null;
  HomePenaltyGoals: number | null;
  AwayPenaltyGoals: number | null;
  EventDescription: LocalizedName[] | null;
}

export function localized(names: LocalizedName[] | null | undefined): string | null {
  return names?.[0]?.Description ?? null;
}

async function fifaFetch<T>(path: string): Promise<T | null> {
  const response = await fetch(`${FIFA_API}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function getFifaSeasonMatches(stageId?: string): Promise<FifaCalendarMatch[]> {
  const stageParam = stageId ? `&idStage=${stageId}` : "";
  const data = await fifaFetch<{ Results: FifaCalendarMatch[] }>(
    `/calendar/matches?idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}${stageParam}&count=500&language=en`
  );
  return data?.Results ?? [];
}

export async function getFifaLiveMatch(
  idStage: string,
  idMatch: string
): Promise<FifaLiveMatch | null> {
  return fifaFetch<FifaLiveMatch>(
    `/live/football/${FIFA_COMPETITION}/${FIFA_SEASON}/${idStage}/${idMatch}?language=en`
  );
}

export async function getFifaTimeline(
  idStage: string,
  idMatch: string
): Promise<FifaTimelineEvent[]> {
  const data = await fifaFetch<{ Event: FifaTimelineEvent[] }>(
    `/timelines/${FIFA_COMPETITION}/${FIFA_SEASON}/${idStage}/${idMatch}?language=en`
  );
  return data?.Event ?? [];
}
