import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getOpenLigaMatches, OpenLigaMatch } from "@/lib/openLigaDb";
import { getKnockoutStageKey, stageLabel } from "@/lib/rounds";
import { statusRank } from "@/lib/utils";

export const dynamic = "force-dynamic";

// World Cup 2026 knockout bracket mapping for the 12-group format.
// "1A" = winner of group A, "2A" = runner-up of group A, "3 A/B/C" = one of the
// best third-placed teams. OpenLigaDB leaves these as placeholders; we resolve
// them ourselves once the group stage is finished.
const KNOCKOUT_PLACEHOLDERS: Record<string, { homeLabel: string; awayLabel: string }> = {
  "82099": { homeLabel: "2A", awayLabel: "2B" },
  "82100": { homeLabel: "1C", awayLabel: "2F" },
  "82101": { homeLabel: "1E", awayLabel: "3 A/B/C/D" },
  "82102": { homeLabel: "1G", awayLabel: "3 C/D/E/F" },
  "82103": { homeLabel: "1I", awayLabel: "3 E/F/G/H" },
  "82104": { homeLabel: "1K", awayLabel: "3 G/H/I/J" },
  "82105": { homeLabel: "1A", awayLabel: "3 C/E/F/H/I" },
  "82106": { homeLabel: "1L", awayLabel: "3 E/H/I/J/K" },
  "82107": { homeLabel: "1B", awayLabel: "3 A/E/H/I/J" },
  "82108": { homeLabel: "1D", awayLabel: "2J" },
  "82109": { homeLabel: "1F", awayLabel: "3 B/E/F/G/I/J" },
  "82110": { homeLabel: "1H", awayLabel: "2L" },
  "82111": { homeLabel: "1J", awayLabel: "3 D/E/I/J/L" },
  "82112": { homeLabel: "2D", awayLabel: "2G" },
  "82113": { homeLabel: "2E", awayLabel: "2I" },
  "82114": { homeLabel: "2K", awayLabel: "2L" },
};

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

type Db = ReturnType<typeof getSupabaseClient>;

// Internal team stats used to compute the group table.
interface TeamStats {
  played: number;
  won: number;
  draw: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

/**
 * Recomputes every group's table from the finished group-stage fixtures and
 * upserts the standings rows. Reads the whole table, so it is always complete
 * regardless of which fixtures triggered the call. Returns the number of groups.
 */
async function computeStandings(db: Db): Promise<Record<string, { teamId: number; rank: number; stats: TeamStats }[]>> {
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

  await db
    .from("app_settings")
    .update({ value: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("key", "last_standings_sync");

  const result: Record<string, { teamId: number; rank: number; stats: TeamStats }[]> = {};
  for (const [group, teams] of Object.entries(standings)) {
    const sorted = Object.entries(teams).sort((a, b) => {
      if (b[1].points !== a[1].points) return b[1].points - a[1].points;
      const diffB = b[1].gf - b[1].ga;
      const diffA = a[1].gf - a[1].ga;
      if (diffB !== diffA) return diffB - diffA;
      return b[1].gf - a[1].gf;
    });
    result[group] = sorted.map(([teamId, stats], i) => ({ teamId: Number(teamId), rank: i + 1, stats }));
  }
  return result;
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

    // OpenLigaDB uses negative/synthetic ids for knockout placeholder teams
    // such as "3 C/E/F/H/I" or "1L". Map them to a stable positive internal id
    // so the fixtures foreign keys stay valid while the bracket fills in.
    const teamId = id > 0 ? id : 100_000 + Math.abs(id);

    const { error } = await db.from("teams").upsert(
      {
        api_id: teamId,
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
        .select("status_short, status_long, home_goals, away_goals, home_team_id, away_team_id, round, raw_payload")
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
        existing.home_team_id !== match.team1.teamId ||
        existing.away_team_id !== match.team2.teamId ||
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
            home_team_id: match.team1.teamId > 0 ? match.team1.teamId : 100_000 + Math.abs(match.team1.teamId),
            away_team_id: match.team2.teamId > 0 ? match.team2.teamId : 100_000 + Math.abs(match.team2.teamId),
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

  // Recompute standings on full/standings syncs, and on any live sync that has
  // matches in its window (live or just finished) — otherwise a match finishing
  // overnight would leave the group table stale until the next daily `all` run.
  // Gating on the window (not on fixturesUpdated) matters because FIFA may be the
  // one that flips a match to FT, leaving this sync with nothing to change.
  const shouldComputeStandings =
    type === "all" ||
    type === "standings" ||
    (type === "live" && matchesToSync.length > 0);

  if (shouldComputeStandings) {
    const computedGroups = await computeStandings(db);
    results.standings = { success: true, groups: Object.keys(computedGroups).length };

    // Once the group stage has finished, resolve the R32 placeholders that
    // OpenLigaDB leaves empty (e.g. "2A vs 2B", "1L", "3 C/E/F/H/I") to the
    // real teams based on the computed standings. This runs on every full sync
    // and on any live sync that has matches in its window, so the bracket
    // fills automatically as groups are decided.
    const groupStageFinished = allMatches.every(
      (m) => (m.group?.groupOrderID ?? 0) !== 3 || m.matchIsFinished
    );
    if ((type === "all" || type === "standings" || (type === "live" && matchesToSync.length > 0)) && groupStageFinished) {
      const resolved = await resolveKnockoutPlaceholders(db, computedGroups, allMatches, now);
      results.knockout = resolved;
    }
  }

  return results;
}

/**
 * Resolves the R32 placeholder teams in the fixtures table using the
 * computed group standings. Returns a summary of resolved/updated matches.
 */
async function resolveKnockoutPlaceholders(
  db: Db,
  standings: Record<string, { teamId: number; rank: number; stats: TeamStats }[]>,
  allMatches: OpenLigaMatch[],
  now: Date
): Promise<Record<string, unknown>> {
  // Build ordered lists of group winners (1X), runners-up (2X) and third-placed teams.
  const winners: Record<string, number> = {};
  const runnersUp: Record<string, number> = {};
  const thirdPlace: Record<string, number | null> = {};

  for (const [groupName, ranked] of Object.entries(standings)) {
    const letter = groupName.replace("Grup ", "").toUpperCase();
    if (ranked[0]) winners[letter] = ranked[0].teamId;
    if (ranked[1]) runnersUp[letter] = ranked[1].teamId;
    if (ranked[2]) thirdPlace[letter] = ranked[2].teamId;
  }

  // Best third-placed teams ordered by FIFA tiebreakers (same as standings sort).
  const bestThird = Object.entries(thirdPlace)
    .filter(([, id]) => id !== null)
    .map(([letter, id]) => {
      const stats = standings[`Grup ${letter}`]?.[2]?.stats;
      return { letter, teamId: id!, stats };
    })
    .sort((a, b) => {
      if (!a.stats || !b.stats) return 0;
      if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
      const diffB = b.stats.gf - b.stats.ga;
      const diffA = a.stats.gf - a.stats.ga;
      if (diffB !== diffA) return diffB - diffA;
      return b.stats.gf - a.stats.gf;
    })
    .map((t) => t.letter);

  const thirdRankByLetter = new Map<string, number>();
  bestThird.forEach((letter, i) => thirdRankByLetter.set(letter, i + 1));

  // R32 placeholder definitions. For third-place combinations we pick the team
  // from the best-third ranking that satisfies the allowed set and is highest
  // in the overall third-place table. For "3 A/B/C" we pick the best third
  // from groups A, B or C.
  const thirdSetPick = (allowed: string[]): number | null => {
    for (const letter of bestThird) {
      if (allowed.includes(letter)) {
        const id = thirdPlace[letter];
        if (id) return id;
      }
    }
    return null;
  };

  const resolveLabel = (label: string): number | null => {
    const oneMatch = label.match(/^1([A-L])$/);
    if (oneMatch) return winners[oneMatch[1]] ?? null;

    const twoMatch = label.match(/^2([A-L])$/);
    if (twoMatch) return runnersUp[twoMatch[1]] ?? null;

    const thirdMatch = label.match(/^3 ([A-L/]+)$/);
    if (thirdMatch) {
      const allowed = thirdMatch[1].split("/");
      return thirdSetPick(allowed);
    }

    return null;
  };

  // Fixture id -> OpenLiga placeholder team name (used only for display name).
  const placeholderNames: Record<string, string> = {};
  const r32Matches = allMatches.filter((m) => (m.group?.groupOrderID ?? 0) === 4);
  for (const match of r32Matches) {
    const ph = KNOCKOUT_PLACEHOLDERS[String(match.matchID)];
    if (!ph) continue;
    const homeId = resolveLabel(ph.homeLabel);
    const awayId = resolveLabel(ph.awayLabel);
    if (!homeId || !awayId) continue;

    // Find the real team rows from the team map/standings so we can show names.
    const homeTeam = allMatches.find((m) => m.team1.teamId === homeId || m.team2.teamId === homeId);
    const awayTeam = allMatches.find((m) => m.team1.teamId === awayId || m.team2.teamId === awayId);
    const homeName = homeTeam
      ? (homeTeam.team1.teamId === homeId ? homeTeam.team1.teamName : homeTeam.team2.teamName)
      : ph.homeLabel;
    const awayName = awayTeam
      ? (awayTeam.team1.teamId === awayId ? awayTeam.team1.teamName : awayTeam.team2.teamName)
      : ph.awayLabel;
    placeholderNames[String(homeId)] = homeName;
    placeholderNames[String(awayId)] = awayName;
  }

  // Ensure placeholder teams exist for the resolved ids (FK integrity) and have a name.
  const uniqueIds = new Set<number>();
  for (const match of r32Matches) {
    const ph = KNOCKOUT_PLACEHOLDERS[String(match.matchID)];
    if (!ph) continue;
    const homeId = resolveLabel(ph.homeLabel);
    const awayId = resolveLabel(ph.awayLabel);
    if (homeId) uniqueIds.add(homeId);
    if (awayId) uniqueIds.add(awayId);
  }
  for (const id of uniqueIds) {
    const name = placeholderNames[String(id)] ?? "Equip resolt";
    const ca = TEAM_NAME_DE_TO_CA[name] || { name, country: name };
    await db.from("teams").upsert(
      {
        api_id: id,
        name: ca.name,
        code: null,
        country: ca.country,
        founded: null,
        national: true,
        logo: null,
        venue_id: null,
        raw_payload: { source: "openligadb-resolved", originalName: name },
        synced_at: new Date().toISOString(),
      },
      { onConflict: "api_id" }
    );
  }

  let updated = 0;
  for (const match of r32Matches) {
    const ph = KNOCKOUT_PLACEHOLDERS[String(match.matchID)];
    if (!ph) continue;

    const homeId = resolveLabel(ph.homeLabel);
    const awayId = resolveLabel(ph.awayLabel);
    if (!homeId || !awayId) continue;

    const { data: existing } = await db
      .from("fixtures")
      .select("home_team_id, away_team_id")
      .eq("api_id", match.matchID)
      .maybeSingle();

    if (!existing) continue;
    if (existing.home_team_id === homeId && existing.away_team_id === awayId) continue;

    const computed = extractMatchState(match, now);
    const { error } = await db
      .from("fixtures")
      .update({
        home_team_id: homeId,
        away_team_id: awayId,
        status_short: computed.status,
        status_long: computed.statusLong,
        home_goals: computed.homeGoals,
        away_goals: computed.awayGoals,
        synced_at: new Date().toISOString(),
      })
      .eq("api_id", match.matchID);

    if (error) {
      console.error(`Knockout resolve error ${match.matchID}:`, error.message);
    } else {
      updated++;
    }
  }

  return { resolved: updated };
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
