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
  FIFA_KNOCKOUT_STAGES,
  FIFA_STAGE_ORDER,
} from "@/lib/fifaApi";
import { isFinishedStatus, isLiveStatus, statusRank } from "@/lib/utils";
import type { OpenLigaMatch } from "@/lib/openLigaDb";
import type { FifaSquadPlayer } from "@/types/fifa";

export const dynamic = "force-dynamic";

const SYNC_SECRET = process.env.SYNC_SECRET;

// Window around kickoff during which a fixture is enriched in `live` mode.
const LIVE_WINDOW_BEFORE_MS = 30 * 60_000;
const LIVE_WINDOW_AFTER_MS = 4 * 3600_000;

// FIFA code -> internal placeholder id for teams not yet known in the bracket.
const PLACEHOLDER_ID_OFFSET = 200_000;

function placeholderTeamId(name: string | null): { id: number; name: string } {
  const label = name?.trim() || "Per determinar";
  // Stable id derived from the label hash so the same placeholder always maps
  // to the same row without colliding with real OpenLigaDB ids.
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return { id: PLACEHOLDER_ID_OFFSET + Math.abs(hash) % 100_000, name: label };
}

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

// FIFA MatchStatus: 0 = finished, 1 = not started, 3 = live (verified against
// the live 2026 feed). Maps to our short status; null means "leave as-is".
function fifaStatusToShort(matchStatus: number | null): { short: string; long: string } | null {
  if (matchStatus === 3) return { short: "LIV", long: "En directe" };
  if (matchStatus === 0) return { short: "FT", long: "Finalitzat" };
  return null;
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
  const dbTeamIds = [...fifaTeamToDbTeam.values()];

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

    // Type 0 = regular goal; Type 34 = own goal. FIFA attributes the own goal to
    // the scoring player's own team, so it must be credited to the opponent (the
    // side whose score actually increases).
    if (event.Type === 0 || event.Type === 34) {
      const isOwnGoal = event.Type === 34;
      const creditedTeamId = isOwnGoal
        ? dbTeamIds.find((id) => id !== teamId) ?? null
        : teamId;
      rows.push({
        ...base,
        team_id: creditedTeamId,
        event_type: "Goal",
        detail: isOwnGoal ? "Own Goal" : goalDetail(description),
        player_id: event.IdPlayer ? Number(event.IdPlayer) : null,
        player_name: playerName,
        assist_id: isOwnGoal || !event.IdSubPlayer ? null : Number(event.IdSubPlayer),
        assist_name: isOwnGoal ? null : subPlayerName,
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

/**
 * Goal rows derived from the OpenLigaDB payload, used as a fallback when the
 * FIFA timeline goals don't reconcile with the score. OpenLigaDB carries the
 * running score, so the scoring side is the counter that increased (own goals
 * naturally land on the benefiting side); it also flags penalties and own goals.
 */
function buildOpenLigaGoalRows(
  fixtureApiId: number,
  original: OpenLigaMatch | undefined,
  homeTeamId: number,
  awayTeamId: number
) {
  const goals = original?.goals;
  if (!goals?.length) return null;

  let prevHome = 0;
  return goals.map((g) => {
    const homeScored = g.scoreTeam1 > prevHome;
    prevHome = g.scoreTeam1;
    return {
      fixture_id: fixtureApiId,
      event_type: "Goal",
      elapsed: g.matchMinute,
      extra_time: null,
      team_id: homeScored ? homeTeamId : awayTeamId,
      player_id: g.goalGetterID || null,
      player_name: g.goalGetterName?.trim() || null,
      assist_id: null,
      assist_name: null,
      detail: g.isOwnGoal ? "Own Goal" : g.isPenalty ? "Penalty" : "Normal Goal",
      comments: g.comment,
      raw_payload: { source: "openligadb", original: g } as Record<string, unknown>,
      synced_at: new Date().toISOString(),
    };
  });
}

function squadFromLive(team: FifaLiveMatch["HomeTeam"]): FifaSquadPlayer[] {
  return (team?.Players ?? []).map((p) => ({
    id: p.IdPlayer,
    name: localized(p.PlayerName) ?? "—",
    number: p.ShirtNumber,
    position: p.Position,
  }));
}

function resolveFifaSide(
  side: FifaCalendarMatch["Home"],
  teamIdByFifaCode: Map<string, number>
): { teamId: number; name: string } {
  const teamName = localized(side?.TeamName ?? null) ?? null;
  const code = side?.Abbreviation?.toUpperCase() ?? null;

  // Known team by FIFA code.
  if (code) {
    const mapped = teamIdByFifaCode.get(code);
    if (mapped) return { teamId: mapped, name: teamName ?? code };
  }

  const placeholder = placeholderTeamId(teamName);
  return { teamId: placeholder.id, name: placeholder.name };
}

function stageLabelFromFifa(stageId: string): string {
  switch (stageId) {
    case "289287":
      return "Setzens de final";
    case "289288":
      return "Vuitens de final";
    case "289289":
      return "Quarts de final";
    case "289290":
      return "Semifinals";
    case "289291":
      return "3r i 4t lloc";
    case "289292":
      return "Final";
    default:
      return "Eliminatòries";
  }
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
  // Reverse index: find DB team by FIFA code (or OpenLigaDB code when identical).
  const teamIdByFifaCode = new Map<string, number>();
  for (const t of teams) {
    const code = t.code?.toUpperCase();
    if (!code) continue;
    const fifaCode = toFifaCode(code);
    if (fifaCode) teamIdByFifaCode.set(fifaCode, t.api_id);
  }

  const fifaByKickoff = new Map<number, FifaCalendarMatch[]>();
  for (const match of fifaMatches) {
    const kickoff = new Date(match.Date).getTime();
    if (!fifaByKickoff.has(kickoff)) fifaByKickoff.set(kickoff, []);
    fifaByKickoff.get(kickoff)!.push(match);
  }

  // ---------------------------------------------------------------------------
  // Knockout fallback: FIFA has all 104 fixtures, OpenLigaDB may still only
  // have the group stage + R32. On full syncs, create any missing knockout
  // fixtures from FIFA so the bracket appears before OpenLigaDB catches up.
  // ---------------------------------------------------------------------------
  let created = 0;
  if (type === "all") {
    const existingIds = new Set(fixtures.map((f) => f.api_id));
    for (const stageId of FIFA_KNOCKOUT_STAGES) {
      const stageMatches = await getFifaSeasonMatches(stageId);
      for (const match of stageMatches) {
        const apiId = Number(match.IdMatch);
        if (existingIds.has(apiId)) continue;

        const { teamId: homeTeamId, name: homeName } = resolveFifaSide(match.Home, teamIdByFifaCode);
        const { teamId: awayTeamId, name: awayName } = resolveFifaSide(match.Away, teamIdByFifaCode);

        // Ensure placeholder rows exist in teams for FK integrity.
        for (const { id, name } of [
          { id: homeTeamId, name: homeName },
          { id: awayTeamId, name: awayName },
        ]) {
          if (id >= PLACEHOLDER_ID_OFFSET && !teamById.has(id)) {
            await db.from("teams").upsert(
              {
                api_id: id,
                name,
                code: null,
                country: null,
                founded: null,
                national: true,
                logo: null,
                venue_id: null,
                raw_payload: { source: "fifa-placeholder", label: name },
                synced_at: new Date().toISOString(),
              },
              { onConflict: "api_id" }
            );
            teamById.set(id, { api_id: id, code: null, raw_payload: { source: "fifa-placeholder", label: name } });
            teamCodeById.set(id, null);
          }
        }

        const orderId = FIFA_STAGE_ORDER[stageId] ?? 4;
        const roundLabel = orderId === 8
          ? match.IdMatch === "400021543" ? "Final" : "3r i 4t lloc"
          : stageLabelFromFifa(match.IdStage);

        const fifaInfo = {
          idMatch: match.IdMatch,
          idStage: match.IdStage,
          stadium: localized(match.Stadium?.Name ?? null),
          city: localized(match.Stadium?.CityName ?? null),
          referee: null,
          attendance: null,
          matchStatus: match.MatchStatus,
          statusShort: null,
          homeScore: null,
          awayScore: null,
          syncedAt: new Date().toISOString(),
        };

        const { error } = await db.from("fixtures").upsert(
          {
            api_id: apiId,
            match_date_utc: new Date(match.Date).toISOString(),
            match_date_local: null,
            status_short: "NS",
            status_long: "No començat",
            round: roundLabel,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_goals: null,
            away_goals: null,
            venue_id: null,
            league_id: 1,
            season: 2026,
            raw_payload: { source: "fifa", fifa: fifaInfo },
            synced_at: new Date().toISOString(),
          },
          { onConflict: "api_id" }
        );

        if (error) {
          console.error("FIFA knockout create error:", error.message);
        } else {
          created++;
          existingIds.add(apiId);
          fixtures.push({
            api_id: apiId,
            match_date_utc: new Date(match.Date).toISOString(),
            status_short: "NS",
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            raw_payload: { source: "fifa", fifa: fifaInfo },
          });
        }
      }
    }
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

    // FIFA is the authoritative real-time source for score and status. Both come
    // straight from the calendar entry (updated live), so no extra request is
    // needed and we are not gated behind OpenLigaDB, which lags on late matches.
    const fifaState = fifaStatusToShort(fifaMatch.MatchStatus);
    const fifaHomeScore = fifaMatch.Home?.Score ?? null;
    const fifaAwayScore = fifaMatch.Away?.Score ?? null;

    const hasStarted =
      fifaMatch.MatchStatus === 3 ||
      fifaMatch.MatchStatus === 0 ||
      isLiveStatus(fixture.status_short) ||
      isFinishedStatus(fixture.status_short);

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
      matchStatus: fifaMatch.MatchStatus,
      statusShort: fifaState?.short ?? null,
      homeScore: fifaHomeScore,
      awayScore: fifaAwayScore,
      syncedAt: new Date().toISOString(),
    };

    // Build the column update: always refresh the fifa blob; additionally drive
    // the visible score/status from FIFA, but never downgrade (don't revert a
    // match OpenLigaDB already marked finished back to live, etc.).
    const fixtureUpdate: Record<string, unknown> = {
      raw_payload: { ...fixture.raw_payload, fifa: fifaInfo },
    };
    if (fifaState && statusRank(fifaState.short) >= statusRank(fixture.status_short)) {
      fixtureUpdate.status_short = fifaState.short;
      fixtureUpdate.status_long = fifaState.long;
      if (fifaHomeScore != null) fixtureUpdate.home_goals = fifaHomeScore;
      if (fifaAwayScore != null) fixtureUpdate.away_goals = fifaAwayScore;
    }

    const { error: fixtureError } = await db
      .from("fixtures")
      .update(fixtureUpdate)
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

    let eventRows = buildEvents(fixture.api_id, timeline, fifaTeamToDbTeam, playerNames);

    // Consistency check: the goal events must reconcile with the score. The FIFA
    // timeline occasionally omits a goal; when the per-side count disagrees with
    // the (authoritative) score, rebuild the goals from OpenLigaDB and keep the
    // FIFA cards/subs, so the timeline never contradicts the result.
    if (fifaHomeScore != null && fifaAwayScore != null) {
      const goalRows = eventRows.filter((r) => r.event_type === "Goal");
      const homeGoals = goalRows.filter((r) => r.team_id === fixture.home_team_id).length;
      const awayGoals = goalRows.filter((r) => r.team_id === fixture.away_team_id).length;

      if (homeGoals !== fifaHomeScore || awayGoals !== fifaAwayScore) {
        const original = (fixture.raw_payload as { original?: OpenLigaMatch }).original;
        const olGoals = buildOpenLigaGoalRows(
          fixture.api_id,
          original,
          fixture.home_team_id,
          fixture.away_team_id
        );
        console.warn(
          `FIFA goal mismatch fixture ${fixture.api_id}: timeline ${homeGoals}-${awayGoals} vs score ${fifaHomeScore}-${fifaAwayScore}` +
            (olGoals ? "; rebuilt goals from OpenLigaDB" : "; no OpenLigaDB fallback available")
        );
        if (olGoals) {
          eventRows = [...eventRows.filter((r) => r.event_type !== "Goal"), ...olGoals];
        }
      }
    }

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
    created,
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
