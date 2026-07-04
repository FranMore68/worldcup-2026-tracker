// Shape of the `fifa` enrichment blob stored inside the JSONB raw_payload of
// teams and fixtures (alongside the original OpenLigaDB payload).

export interface FifaSquadPlayer {
  id: string;
  name: string;
  number: number | null;
  // 0 = goalkeeper, 1 = defender, 2 = midfielder, 3 = forward
  position: number | null;
}

export interface TeamFifaData {
  idTeam: string;
  code: string | null;
  coach: string | null;
  squad: FifaSquadPlayer[];
  syncedAt: string;
}

export interface FixtureFifaData {
  idMatch: string;
  idStage: string;
  stadium: string | null;
  city: string | null;
  referee: string | null;
  attendance: number | null;
  // Live score/status from FIFA (the authoritative real-time source). Present
  // once the match has a FIFA status of live or finished; lets the app show the
  // score even while OpenLigaDB (community-sourced) still lags behind.
  matchStatus: number | null;
  statusShort: string | null;
  homeScore: number | null;
  awayScore: number | null;
  // Penalty shootout result for knockout matches. Only present when the match
  // was decided by penalties.
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  syncedAt: string;
}
