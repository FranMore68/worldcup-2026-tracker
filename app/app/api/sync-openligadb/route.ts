import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getOpenLigaMatches, OpenLigaMatch } from "@/lib/openLigaDb";
import { getKnockoutStageKey, stageLabel } from "@/lib/rounds";
import { statusRank } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SYNC_SECRET = process.env.SYNC_SECRET;

// A match is considered potentially live from kickoff until this many minutes
// later (covers extra time, penalties and long stoppages). Generous on purpose:
// beyond it, a match OpenLigaDB still hasn't flagged finished is assumed over
// rather than reverted to "not started".
const LIVE_WINDOW_MINUTES = 210;

const TEAM_NAME_DE_TO_CA: Record<string, { name: string; country: string }> = {
  "Mexiko": { name: "Mèxic", country: "Mèxic" },
  "Südafrika": { name: "Sud-àfrica", country: "Sud-àfrica" },
  "Südkorea": { name: "Corea del Sud", country: "Corea del Sud" },
  "Tschechien": { name: "Txèquia", country: "Txèquia" },
  "Bosnien und Herzegowina": { name: "Bòsnia i Hercegovina", country: "Bòsnia i Hercegovina" },
  "Kanada": { name: "Canadà", country: "Canadà" },
  "USA": { name: "Estats Units", country: "Estats Units" },
  "Paraguay": { name: "Paraguai", country: "Paraguai" },
  "Katar": { name: "Qatar", country: "Qatar" },
  "Schweiz": { name: "Suïssa", country: "Suïssa" },
  "Brasilien": { name: "Brasil", country: "Brasil" },
  "Marokko": { name: "Marroc", country: "Marroc" },
  "Haiti": { name: "Haití", country: "Haití" },
  "Schottland": { name: "Escòcia", country: "Escòcia" },
  "Australien": { name: "Austràlia", country: "Austràlia" },
  "Türkei": { name: "Turquia", country: "Turquia" },
  "Deutschland": { name: "Alemanya", country: "Alemanya" },
  "Curaçao": { name: "Curaçao", country: "Curaçao" },
  "Niederlande": { name: "Països Baixos", country: "Països Baixos" },
  "Japan": { name: "Japó", country: "Japó" },
  "Elfenbeinküste": { name: "Costa d'Ivori", country: "Costa d'Ivori" },
  "Ecuador": { name: "Equador", country: "Equador" },
  "Schweden": { name: "Suècia", country: "Suècia" },
  "Tunesien": { name: "Tunísia", country: "Tunísia" },
  "Spanien": { name: "Espanya", country: "Espanya" },
  "Kap Verde": { name: "Cap Verd", country: "Cap Verd" },
  "Belgien": { name: "Bèlgica", country: "Bèlgica" },
  "Ägypten": { name: "Egipte", country: "Egipte" },
  "Iran": { name: "Iran", country: "Iran" },
  "Neuseeland": { name: "Nova Zelanda", country: "Nova Zelanda" },
  "Österreich": { name: "Àustria", country: "Àustria" },
  "Jordanien": { name: "Jordània", country: "Jordània" },
  "Frankreich": { name: "França", country: "França" },
  "Senegal": { name: "Senegal", country: "Senegal" },
  "Irak": { name: "Iraq", country: "Iraq" },
  "Norwegen": { name: "Noruega", country: "Noruega" },
  "Argentinien": { name: "Argentina", country: "Argentina" },
  "Algerien": { name: "Algèria", country: "Algèria" },
  "Portugal": { name: "Portugal", country: "Portugal" },
  "DR Kongo": { name: "R. D. del Congo", country: "R. D. del Congo" },
  "England": { name: "Anglaterra", country: "Anglaterra" },
  "Kroatien": { name: "Croàcia", country: "Croàcia" },
  "Ghana": { name: "Ghana", country: "Ghana" },
  "Panama": { name: "Panamà", country: "Panamà" },
  "Usbekistan": { name: "Uzbekistan", country: "Uzbekistan" },
  "Kolumbien": { name: "Colòmbia", country: "Colòmbia" },
  "Saudi Arabien": { name: "Aràbia Saudita", country: "Aràbia Saudita" },
  "Uruguay": { name: "Uruguai", country: "Uruguai" },
};

const GROUPS: Record<string, number[]> = {
  "Grup A": [761, 677, 751, 141],
  "Grup B": [2671, 1645, 4912, 38],
  "Grup C": [753, 4629, 5820, 5271],
  "Grup D": [762, 756, 750, 153],
  "Grup E": [139, 7321, 4993, 2670],
  "Grup F": [4353, 749, 1391, 151],
  "Grup G": [2673, 4766, 5570, 846],
  "Grup H": [170, 6159, 4670, 5593],
  "Grup I": [1647, 4630, 1396, 7434],
  "Grup J": [764, 7322, 37, 7323],
  "Grup K": [3198, 7324, 1469, 4991],
  "Grup L": [755, 7325, 754, 4631],
};

function getGroupForMatch(team1Id: number, team2Id: number): string {
  for (const [group, ids] of Object.entries(GROUPS)) {
    if (ids.includes(team1Id) && ids.includes(team2Id)) return group;
  }
  return "Grup Desconegut";
}

/**
 * Canonical round label in Catalan. Group stage: "Grup X - Jornada N".
 * Knockout: stage label from lib/rounds. Within the "Finale" matchday the
 * latest kickoff is the final, the other match is the 3rd-place playoff.
 */
function getRoundLabel(match: OpenLigaMatch, allMatches: OpenLigaMatch[]): string {
  const orderId = match.group?.groupOrderID ?? 0;

  if (orderId >= 1 && orderId <= 3) {
    const group = getGroupForMatch(match.team1.teamId, match.team2.teamId);
    return `${group} - Jornada ${orderId}`;
  }

  const sameDayMatches = allMatches.filter(
    (m) => (m.group?.groupOrderID ?? 0) === orderId
  );
  const lastKickoff = sameDayMatches.reduce(
    (max, m) => (m.matchDateTimeUTC > max ? m.matchDateTimeUTC : max),
    match.matchDateTimeUTC
  );
  const isLastOfFinalDay =
    sameDayMatches.length <= 1 || match.matchDateTimeUTC === lastKickoff;

  const key = getKnockoutStageKey(
    { round: null, raw_payload: { original: { group: match.group } } },
    isLastOfFinalDay
  );

  return key ? stageLabel(key) : `Eliminatòries - Jornada ${orderId}`;
}

interface ExtractedState {
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  statusLong: string;
}

function extractMatchState(match: OpenLigaMatch, now: Date): ExtractedState {
  const kickoff = new Date(match.matchDateTimeUTC);
  const liveWindowEnd = new Date(kickoff.getTime() + LIVE_WINDOW_MINUTES * 60_000);

  if (match.matchIsFinished) {
    const finalResult = match.matchResults?.find((r) => r.resultTypeID === 2);
    if (finalResult) {
      return {
        homeGoals: finalResult.pointsTeam1,
        awayGoals: finalResult.pointsTeam2,
        status: "FT",
        statusLong: "Finalitzat",
      };
    }
  }

  const lastGoal = match.goals && match.goals.length > 0
    ? match.goals[match.goals.length - 1]
    : null;

  if (match.matchIsFinished) {
    // Finished but without a typed final result: fall back to last goal score.
    return {
      homeGoals: lastGoal?.scoreTeam1 ?? 0,
      awayGoals: lastGoal?.scoreTeam2 ?? 0,
      status: "FT",
      statusLong: "Finalitzat",
    };
  }

  if (now < kickoff) {
    return { homeGoals: null, awayGoals: null, status: "NS", statusLong: "No començat" };
  }

  if (now <= liveWindowEnd) {
    return {
      homeGoals: lastGoal?.scoreTeam1 ?? 0,
      awayGoals: lastGoal?.scoreTeam2 ?? 0,
      status: "LIV",
      statusLong: "En directe",
    };
  }

  // Kicked off and well past the live window but OpenLigaDB hasn't flagged it
  // finished (community data lag). It is almost certainly over — show the last
  // known score as final instead of reverting to "not started".
  return {
    homeGoals: lastGoal?.scoreTeam1 ?? 0,
    awayGoals: lastGoal?.scoreTeam2 ?? 0,
    status: "FT",
    statusLong: "Finalitzat",
  };
}

/**
 * OpenLigaDB goals carry the running score but not the scoring team, so the
 * side is derived from which counter increased relative to the previous goal.
 */
function buildGoalEvents(match: OpenLigaMatch) {
  let prevHome = 0;
  const events = [];

  for (const goal of match.goals ?? []) {
    const homeScored = goal.scoreTeam1 > prevHome;
    const teamId = homeScored ? match.team1.teamId : match.team2.teamId;
    prevHome = goal.scoreTeam1;

    events.push({
      fixture_id: match.matchID,
      event_type: "Goal",
      elapsed: goal.matchMinute,
      extra_time: null,
      team_id: teamId,
      player_id: goal.goalGetterID || null,
      player_name: goal.goalGetterName?.trim() || null,
      assist_id: null,
      assist_name: null,
      detail: goal.isOwnGoal
        ? "Own Goal"
        : goal.isPenalty
          ? "Penalty"
          : "Normal Goal",
      comments: goal.comment,
      raw_payload: goal as unknown as Record<string, unknown>,
      synced_at: new Date().toISOString(),
    });
  }

  return events;
}

function isAuthorized(request: NextRequest): boolean {
  if (!SYNC_SECRET) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${SYNC_SECRET}`) return true;
  const secretParam = request.nextUrl.searchParams.get("secret");
  return secretParam === SYNC_SECRET;
}

async function runSync(type: string) {
  const db = getSupabaseClient();
  const allMatches = await getOpenLigaMatches(2026);
  const now = new Date();

  const results: Record<string, unknown> = {};

  const matchesToSync =
    type === "live"
      ? allMatches.filter((m) => {
          const kickoff = new Date(m.matchDateTimeUTC);
          const windowStart = new Date(kickoff.getTime() - 6 * 3600_000);
          const windowEnd = new Date(kickoff.getTime() + LIVE_WINDOW_MINUTES * 60_000 + 3600_000);
          return now >= windowStart && now <= windowEnd;
        })
      : allMatches;

  // Always upsert the teams referenced by the matches being synced, so the
  // fixtures FK is satisfied even for knockout placeholders that appear later.
  const teamMap = new Map<number, OpenLigaMatch["team1"]>();
  const teamSource = type === "teams" || type === "all" ? allMatches : matchesToSync;

  for (const match of teamSource) {
    [match.team1, match.team2].forEach((t) => {
      if (t?.teamId && !teamMap.has(t.teamId)) teamMap.set(t.teamId, t);
    });
  }

  // Preserve the FIFA enrichment blob (squad/coach) written by /api/sync-fifa.
  const { data: existingTeams } = await db.from("teams").select("api_id, raw_payload");
  const existingFifaByTeam = new Map<number, unknown>();
  for (const row of (existingTeams ?? []) as { api_id: number; raw_payload: Record<string, unknown> }[]) {
    if (row.raw_payload?.fifa) existingFifaByTeam.set(row.api_id, row.raw_payload.fifa);
  }

  for (const [id, team] of teamMap) {
    const ca = TEAM_NAME_DE_TO_CA[team.teamName] || { name: team.teamName, country: team.teamName };
    const rawPayload: Record<string, unknown> = { source: "openligadb", original: team };
    const existingFifa = existingFifaByTeam.get(id);
    if (existingFifa) rawPayload.fifa = existingFifa;

    const { error } = await db.from("teams").upsert(
      {
        api_id: id,
        name: ca.name,
        code: team.shortName,
        country: ca.country,
        founded: null,
        national: true,
        logo: team.teamIconUrl || null,
        venue_id: null,
        raw_payload: rawPayload,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "api_id" }
    );
    if (error) console.error("Team error:", error.message);
  }

  results.teams = { success: true, count: teamMap.size };

  if (type === "all" || type === "fixtures" || type === "live") {
    let updated = 0;
    let eventsWritten = 0;

    for (const match of matchesToSync) {
      if (!match.team1?.teamId || !match.team2?.teamId) continue;

      const round = getRoundLabel(match, allMatches);
      const computed = extractMatchState(match, now);

      const { data: existing } = await db
        .from("fixtures")
        .select("status_short, status_long, home_goals, away_goals, round, raw_payload")
        .eq("api_id", match.matchID)
        .maybeSingle();

      // Don't downgrade a match FIFA (or a prior sync) already advanced: if
      // OpenLigaDB is lagging behind, preserve the existing status and score and
      // only refresh the round label / raw payload.
      const isDowngrade =
        !!existing && statusRank(computed.status) < statusRank(existing.status_short);

      const status = isDowngrade ? existing.status_short : computed.status;
      const statusLong = isDowngrade
        ? existing.status_long ?? computed.statusLong
        : computed.statusLong;
      const homeGoals = isDowngrade ? existing.home_goals : computed.homeGoals;
      const awayGoals = isDowngrade ? existing.away_goals : computed.awayGoals;

      const needsUpdate =
        !existing ||
        existing.status_short !== status ||
        existing.home_goals !== homeGoals ||
        existing.away_goals !== awayGoals ||
        existing.round !== round;

      if (needsUpdate) {
        // Preserve the FIFA enrichment blob written by /api/sync-fifa.
        const existingFifa = (existing?.raw_payload as Record<string, unknown> | undefined)?.fifa;
        const rawPayload: Record<string, unknown> = { source: "openligadb", original: match };
        if (existingFifa) rawPayload.fifa = existingFifa;

        const { error } = await db.from("fixtures").upsert(
          {
            api_id: match.matchID,
            match_date_utc: new Date(match.matchDateTimeUTC).toISOString(),
            match_date_local: match.matchDateTime,
            status_short: status,
            status_long: statusLong,
            round,
            home_team_id: match.team1.teamId,
            away_team_id: match.team2.teamId,
            home_goals: homeGoals,
            away_goals: awayGoals,
            venue_id: null,
            league_id: 1,
            season: 2026,
            raw_payload: rawPayload,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "api_id" }
        );

        if (error) {
          console.error("Fixture error:", error.message);
          continue;
        }
        updated++;

        // Refresh goal events for this fixture (delete + insert keeps the
        // table consistent when OpenLigaDB corrects scorers afterwards).
        // Skip when the FIFA sync already wrote richer events for it.
        const { data: fifaEvents } = await db
          .from("fixture_events")
          .select("id")
          .eq("fixture_id", match.matchID)
          .filter("raw_payload->>source", "eq", "fifa")
          .limit(1);

        if (!fifaEvents || fifaEvents.length === 0) {
          const goalEvents = buildGoalEvents(match);
          await db
            .from("fixture_events")
            .delete()
            .eq("fixture_id", match.matchID)
            .eq("event_type", "Goal");

          if (goalEvents.length > 0) {
            const { error: eventsError } = await db.from("fixture_events").insert(goalEvents);
            if (eventsError) {
              console.error("Events error:", eventsError.message);
            } else {
              eventsWritten += goalEvents.length;
            }
          }
        }
      }
    }

    results.fixtures = {
      success: true,
      count: matchesToSync.length,
      updated,
      events: eventsWritten,
    };

    await db
      .from("app_settings")
      .update({ value: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("key", "last_fixtures_sync");
  }

  if (type === "all" || type === "standings") {
    // Standings are computed only from finished group-stage fixtures.
    const { data: fixtures } = await db
      .from("fixtures")
      .select("*")
      .eq("season", 2026)
      .eq("status_short", "FT")
      .like("round", "Grup %");

    const standings: Record<
      string,
      Record<
        number,
        { played: number; won: number; draw: number; lost: number; gf: number; ga: number; points: number }
      >
    > = {};

    // Every group starts with its four teams at zero, so ranks are always
    // complete even before any match has finished.
    for (const [group, teamIds] of Object.entries(GROUPS)) {
      standings[group] = {};
      for (const teamId of teamIds) {
        standings[group][teamId] = { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };
      }
    }

    for (const fixture of fixtures || []) {
      const group = fixture.round?.split(" - ")[0] || "Grup Desconegut";
      if (!standings[group]) standings[group] = {};

      const homeId = fixture.home_team_id;
      const awayId = fixture.away_team_id;
      const homeGoals = fixture.home_goals ?? 0;
      const awayGoals = fixture.away_goals ?? 0;

      if (!standings[group][homeId]) standings[group][homeId] = { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };
      if (!standings[group][awayId]) standings[group][awayId] = { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };

      standings[group][homeId].played++;
      standings[group][awayId].played++;
      standings[group][homeId].gf += homeGoals;
      standings[group][homeId].ga += awayGoals;
      standings[group][awayId].gf += awayGoals;
      standings[group][awayId].ga += homeGoals;

      if (homeGoals > awayGoals) {
        standings[group][homeId].won++;
        standings[group][homeId].points += 3;
        standings[group][awayId].lost++;
      } else if (homeGoals < awayGoals) {
        standings[group][awayId].won++;
        standings[group][awayId].points += 3;
        standings[group][homeId].lost++;
      } else {
        standings[group][homeId].draw++;
        standings[group][homeId].points += 1;
        standings[group][awayId].draw++;
        standings[group][awayId].points += 1;
      }
    }

    for (const [group, teams] of Object.entries(standings)) {
      // FIFA tiebreakers (simplified): points, goal difference, goals scored.
      const sorted = Object.entries(teams).sort((a, b) => {
        if (b[1].points !== a[1].points) return b[1].points - a[1].points;
        const diffB = b[1].gf - b[1].ga;
        const diffA = a[1].gf - a[1].ga;
        if (diffB !== diffA) return diffB - diffA;
        return b[1].gf - a[1].gf;
      });

      for (let i = 0; i < sorted.length; i++) {
        const [teamId, stats] = sorted[i];
        await db.from("standings").upsert(
          {
            season: 2026,
            group_name: group,
            team_id: Number(teamId),
            rank: i + 1,
            points: stats.points,
            goals_diff: stats.gf - stats.ga,
            played: stats.played,
            won: stats.won,
            draw: stats.draw,
            lost: stats.lost,
            goals_for: stats.gf,
            goals_against: stats.ga,
            raw_payload: { source: "openligadb", calculated: true },
            synced_at: new Date().toISOString(),
          },
          { onConflict: "season, group_name, team_id" }
        );
      }
    }

    results.standings = { success: true, groups: Object.keys(standings).length };

    await db
      .from("app_settings")
      .update({ value: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("key", "last_standings_sync");
  }

  return results;
}

async function handleRequest(request: NextRequest, type: string) {
  if (!SYNC_SECRET) {
    return NextResponse.json({ error: "SYNC_SECRET not configured" }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runSync(type);
    return NextResponse.json({
      success: true,
      syncs: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let type = "all";
  try {
    const body = (await request.json()) as { type?: string };
    if (body.type) type = body.type;
  } catch {
    // Empty body: keep default.
  }
  return handleRequest(request, type);
}

// GET variant so plain cron jobs (crontab/Coolify scheduled tasks) can call
// the sync with a simple curl: /api/sync-openligadb?type=live&secret=...
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "all";
  return handleRequest(request, type);
}
