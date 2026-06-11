import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getFifaSeasonMatches,
  getFifaLiveMatch,
  getFifaTimeline,
  localized,
  FifaCalendarMatch,
  FifaLiveMatch,
  FifaTimelineEvent,
} from "@/lib/fifaApi";
import { isFinishedStatus, isLiveStatus } from "@/lib/utils";
import type { FifaSquadPlayer } from "@/types/fifa";

export const dynamic = "force-dynamic";

const SYNC_SECRET = process.env.SYNC_SECRET;

// Window around kickoff during which a fixture is enriched in `live` mode.
const LIVE_WINDOW_BEFORE_MS = 30 * 60_000;
const LIVE_WINDOW_AFTER_MS = 4 * 3600_000;

// teams.code holds the OpenLigaDB abbreviation (ISO-3166-alpha3 style); FIFA
// uses its own codes. Only the differing pairs are listed, rest are identical.
const OPENLIGA_TO_FIFA_CODE: Record<string, string> = {
  DEU: "GER",
  CHE: "SUI",
  HRV: "CRO",
  PRT: "POR",
  DZA: "ALG",
  SCT: "SCO",
  URY: "URU",
  HTI: "HAI",
  SAU: "KSA",
  NLD: "NED",
};

function toFifaCode(openLigaCode: string | null): string | null {
  if (!openLigaCode) return null;
  const upper = openLigaCode.toUpperCase();
  return OPENLIGA_TO_FIFA_CODE[upper] ?? upper;
}

interface DbFixture {
  api_id: number;
  match_date_utc: string;
  status_short: string;
  home_team_id: number;
  away_team_id: number;
  raw_payload: Record<string, unknown>;
}

interface DbTeam {
  api_id: number;
  code: string | null;
  raw_payload: Record<string, unknown>;
}

function isAuthorized(request: NextRequest): boolean {
  if (!SYNC_SECRET) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${SYNC_SECRET}`) return true;
  return request.nextUrl.searchParams.get("secret") === SYNC_SECRET;
}

/**
 * Pairs a DB fixture with its FIFA counterpart by kickoff time; when several
 * matches share a kickoff, the FIFA team code of either side disambiguates.
 */
function findFifaMatch(
  fixture: DbFixture,
  fifaByKickoff: Map<number, FifaCalendarMatch[]>,
  teamCodeById: Map<number, string | null>
): FifaCalendarMatch | null {
  const kickoff = new Date(fixture.match_date_utc).getTime();
  const candidates = fifaByKickoff.get(kickoff) ?? [];
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const homeCode = toFifaCode(teamCodeById.get(fixture.home_team_id) ?? null);
  const awayCode = toFifaCode(teamCodeById.get(fixture.away_team_id) ?? null);

  return (
    candidates.find(
      (m) =>
        (homeCode && m.Home?.Abbreviation === homeCode) ||
        (awayCode && m.Away?.Abbreviation === awayCode)
    ) ?? null
  );
}

function parseMinute(matchMinute: string | null): { elapsed: number | null; extra: number | null } {
  if (!matchMinute) return { elapsed: null, extra: null };
  const match = matchMinute.match(/(\d+)'(?:\s*\+\s*(\d+)')?/);
  if (!match) return { elapsed: null, extra: null };
  return { elapsed: Number(match[1]), extra: match[2] ? Number(match[2]) : null };
}

function goalDetail(description: string | null): string {
  const lower = (description ?? "").toLowerCase();
  if (lower.includes("own goal")) return "Own Goal";
  if (lower.includes("penalty")) return "Penalty";
  return "Normal Goal";
}

/**
 * Converts FIFA timeline events to fixture_events rows. Substitutions: FIFA's
 * IdPlayer is the player coming on and IdSubPlayer the one going off; our rows
 * store player_name = out, assist_name = in. For goals IdSubPlayer is the assist.
 */
function buildEvents(
  fixtureApiId: number,
  events: FifaTimelineEvent[],
  fifaTeamToDbTeam: Map<string, number>,
  playerNames: Map<string, string>
) {
  const rows = [];

  for (const event of events) {
    const { elapsed, extra } = parseMinute(event.MatchMinute);
    const teamId = event.IdTeam ? fifaTeamToDbTeam.get(event.IdTeam) ?? null : null;
    const description = localized(event.EventDescription);
    const playerName = event.IdPlayer ? playerNames.get(event.IdPlayer) ?? null : null;
    const subPlayerName = event.IdSubPlayer ? playerNames.get(event.IdSubPlayer) ?? null : null;

    const base = {
      fixture_id: fixtureApiId,
      elapsed,
      extra_time: extra,
      team_id: teamId,
      comments: description,
      raw_payload: { source: "fifa", original: event } as Record<string, unknown>,
      synced_at: new Date().toISOString(),
    };

    if (event.Type === 0) {
      rows.push({
        ...base,
        event_type: "Goal",
        detail: goalDetail(description),
        player_id: event.IdPlayer ? Number(event.IdPlayer) : null,
        player_name: playerName,
        assist_id: event.IdSubPlayer ? Number(event.IdSubPlayer) : null,
        assist_name: subPlayerName,
      });
    } else if (event.Type === 2 || event.Type === 3 || event.Type === 4) {
      if (!event.IdPlayer) continue; // cards to staff/bench without player
      rows.push({
        ...base,
        event_type: "Card",
        detail: event.Type === 2 ? "Yellow Card" : "Red Card",
        player_id: Number(event.IdPlayer),
        player_name: playerName,
        assist_id: null,
        assist_name: null,
      });
    } else if (event.Type === 5) {
      rows.push({
        ...base,
        event_type: "subst",
        detail: "Substitution",
        player_id: event.IdSubPlayer ? Number(event.IdSubPlayer) : null,
        player_name: subPlayerName,
        assist_id: event.IdPlayer ? Number(event.IdPlayer) : null,
        assist_name: playerName,
      });
    }
  }

  return rows;
}

function squadFromLive(team: FifaLiveMatch["HomeTeam"]): FifaSquadPlayer[] {
  return (team?.Players ?? []).map((p) => ({
    id: p.IdPlayer,
    name: localized(p.PlayerName) ?? "—",
    number: p.ShirtNumber,
    position: p.Position,
  }));
}

async function runSync(type: string) {
  const db = getSupabaseClient();
  const now = Date.now();

  const [{ data: fixturesData }, { data: teamsData }, fifaMatches] = await Promise.all([
    db.from("fixtures").select("api_id, match_date_utc, status_short, home_team_id, away_team_id, raw_payload"),
    db.from("teams").select("api_id, code, raw_payload"),
    getFifaSeasonMatches(),
  ]);

  const fixtures = (fixturesData ?? []) as DbFixture[];
  const teams = (teamsData ?? []) as DbTeam[];

  if (fifaMatches.length === 0) {
    return { error: "FIFA API returned no matches (API unavailable?)" };
  }

  const teamCodeById = new Map(teams.map((t) => [t.api_id, t.code]));
  const teamById = new Map(teams.map((t) => [t.api_id, t]));

  const fifaByKickoff = new Map<number, FifaCalendarMatch[]>();
  for (const match of fifaMatches) {
    const kickoff = new Date(match.Date).getTime();
    if (!fifaByKickoff.has(kickoff)) fifaByKickoff.set(kickoff, []);
    fifaByKickoff.get(kickoff)!.push(match);
  }

  const targets = fixtures.filter((fixture) => {
    if (type === "live") {
      const kickoff = new Date(fixture.match_date_utc).getTime();
      return now >= kickoff - LIVE_WINDOW_BEFORE_MS && now <= kickoff + LIVE_WINDOW_AFTER_MS;
    }
    return true;
  });

  let infoUpdated = 0;
  let eventsWritten = 0;
  let squadsUpdated = 0;
  let unmatched = 0;
  const updatedTeamIds = new Set<number>();

  for (const fixture of targets) {
    const fifaMatch = findFifaMatch(fixture, fifaByKickoff, teamCodeById);
    if (!fifaMatch) {
      unmatched++;
      continue;
    }

    const hasStarted =
      isLiveStatus(fixture.status_short) || isFinishedStatus(fixture.status_short);

    // Match info (stadium, referee, attendance) from the calendar entry.
    const referee =
      localized(fifaMatch.Officials?.find((o) => o.OfficialType === 1)?.NameShort ?? null) ??
      localized(fifaMatch.Officials?.[0]?.NameShort ?? null);

    const fifaInfo = {
      idMatch: fifaMatch.IdMatch,
      idStage: fifaMatch.IdStage,
      stadium: localized(fifaMatch.Stadium?.Name ?? null),
      city: localized(fifaMatch.Stadium?.CityName ?? null),
      referee,
      attendance: fifaMatch.Attendance != null ? Number(fifaMatch.Attendance) || null : null,
      syncedAt: new Date().toISOString(),
    };

    const { error: fixtureError } = await db
      .from("fixtures")
      .update({ raw_payload: { ...fixture.raw_payload, fifa: fifaInfo } })
      .eq("api_id", fixture.api_id);
    if (!fixtureError) infoUpdated++;

    if (!hasStarted) continue;

    // Full detail: squads, coaches and the event timeline.
    const [live, timeline] = await Promise.all([
      getFifaLiveMatch(fifaMatch.IdStage, fifaMatch.IdMatch),
      getFifaTimeline(fifaMatch.IdStage, fifaMatch.IdMatch),
    ]);

    if (!live) continue;

    const playerNames = new Map<string, string>();
    const fifaTeamToDbTeam = new Map<string, number>();

    const sides: Array<{ side: FifaLiveMatch["HomeTeam"]; dbTeamId: number }> = [
      { side: live.HomeTeam, dbTeamId: fixture.home_team_id },
      { side: live.AwayTeam, dbTeamId: fixture.away_team_id },
    ];

    for (const { side, dbTeamId } of sides) {
      if (!side?.IdTeam) continue;
      fifaTeamToDbTeam.set(side.IdTeam, dbTeamId);
      for (const player of side.Players ?? []) {
        const name = localized(player.PlayerName);
        if (name) playerNames.set(player.IdPlayer, name);
      }

      // Squad + coach stored on the team row (newest match wins).
      const squad = squadFromLive(side);
      if (squad.length > 0 && !updatedTeamIds.has(dbTeamId)) {
        const team = teamById.get(dbTeamId);
        if (team) {
          const coach = localized(side.Coaches?.[0]?.Name ?? null);
          const { error: teamError } = await db
            .from("teams")
            .update({
              raw_payload: {
                ...team.raw_payload,
                fifa: {
                  idTeam: side.IdTeam,
                  code: teamCodeById.get(dbTeamId) ?? null,
                  coach,
                  squad,
                  syncedAt: new Date().toISOString(),
                },
              },
            })
            .eq("api_id", dbTeamId);
          if (!teamError) {
            squadsUpdated++;
            updatedTeamIds.add(dbTeamId);
          }
        }
      }
    }

    const eventRows = buildEvents(fixture.api_id, timeline, fifaTeamToDbTeam, playerNames);
    if (eventRows.length > 0) {
      // FIFA events replace the OpenLigaDB goal events: same goals, richer data.
      await db.from("fixture_events").delete().eq("fixture_id", fixture.api_id);
      const { error: eventsError } = await db.from("fixture_events").insert(eventRows);
      if (eventsError) {
        console.error("FIFA events error:", eventsError.message);
      } else {
        eventsWritten += eventRows.length;
      }
    }
  }

  return {
    type,
    fixturesChecked: targets.length,
    matched: targets.length - unmatched,
    infoUpdated,
    eventsWritten,
    squadsUpdated,
  };
}

async function handleRequest(request: NextRequest, type: string) {
  if (!SYNC_SECRET) {
    return NextResponse.json({ error: "SYNC_SECRET not configured" }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSync(type);
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "live";
  return handleRequest(request, type);
}

export async function POST(request: NextRequest) {
  let type = "live";
  try {
    const body = (await request.json()) as { type?: string };
    if (body.type) type = body.type;
  } catch {
    // Empty body: keep default.
  }
  return handleRequest(request, type);
}
