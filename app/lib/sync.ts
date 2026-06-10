"use server";

import { getTeams, getFixtures, getStandings, getFixtureById } from "./apiFootball";
import { getSupabaseClient } from "./supabase";

const LEAGUE_ID = 1;
const SEASON = 2026;

function getDb() {
  return getSupabaseClient();
}

export async function syncTeams() {
  const log = await createSyncLog("teams");

  try {
    const { data: teamsData } = await getTeams(LEAGUE_ID, SEASON);

    for (const item of teamsData) {
      const { team, venue } = item;

      if (venue?.id) {
        await getDb().from("venues").upsert(
          {
            api_id: venue.id,
            name: venue.name,
            address: venue.address,
            city: venue.city,
            country: venue.country,
            capacity: venue.capacity,
            surface: venue.surface,
            image: venue.image,
            raw_payload: venue as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "api_id" }
        );
      }

      await getDb().from("teams").upsert(
        {
          api_id: team.id,
          name: team.name,
          code: team.code,
          country: team.country,
          founded: team.founded,
          national: team.national,
          logo: team.logo,
          venue_id: venue?.id ?? null,
          raw_payload: item as unknown as Record<string, unknown>,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "api_id" }
      );
    }

    await updateSyncLog(log.id, "completed", teamsData.length);
    await updateSetting("last_teams_sync", new Date().toISOString());

    return { success: true, count: teamsData.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateSyncLog(log.id, "failed", 0, message);
    throw error;
  }
}

export async function syncFixtures() {
  const log = await createSyncLog("fixtures");

  try {
    const { data: fixturesData } = await getFixtures(LEAGUE_ID, SEASON);

    for (const item of fixturesData) {
      const fixture = item.fixture;
      const homeTeam = item.teams.home;
      const awayTeam = item.teams.away;

      await getDb().from("fixtures").upsert(
        {
          api_id: fixture.id,
          match_date_utc: new Date(fixture.date).toISOString(),
          match_date_local: null,
          status_short: fixture.status.short,
          status_long: fixture.status.long,
          round: (item.league as unknown as Record<string, unknown>).round as string | null ?? null,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          home_goals: item.goals.home,
          away_goals: item.goals.away,
          venue_id: fixture.venue?.id ?? null,
          league_id: item.league.id,
          season: SEASON,
          raw_payload: item as unknown as Record<string, unknown>,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "api_id" }
      );
    }

    await updateSyncLog(log.id, "completed", fixturesData.length);
    await updateSetting("last_fixtures_sync", new Date().toISOString());

    return { success: true, count: fixturesData.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateSyncLog(log.id, "failed", 0, message);
    throw error;
  }
}

export async function syncLive() {
  const log = await createSyncLog("live");

  try {
    // Get today's fixtures from database
    const today = new Date().toISOString().split("T")[0];
    const { data: todayFixtures } = await getDb()
      .from("fixtures")
      .select("api_id, status_short, match_date_utc")
      .gte("match_date_utc", `${today}T00:00:00Z`)
      .lte("match_date_utc", `${today}T23:59:59Z`);

    if (!todayFixtures || todayFixtures.length === 0) {
      await updateSyncLog(log.id, "completed", 0, "No fixtures today");
      return { success: true, count: 0, reason: "No fixtures today" };
    }

    // Filter: only sync those that are NS (not started), LIV, HT, or BT
    const liveStatuses = ["NS", "LIV", "HT", "BT", "TBD"];
    const fixturesToCheck = todayFixtures.filter((f: { status_short: string }) =>
      liveStatuses.includes(f.status_short)
    );

    let updatedCount = 0;
    const updatedIds: number[] = [];

    for (const dbFixture of fixturesToCheck) {
      const { data: freshData } = await getFixtureById(dbFixture.api_id);

      if (freshData.length === 0) continue;

      const item = freshData[0];
      const fixture = item.fixture;

      // Only update if status or score changed
      const dbHomeGoals = (dbFixture as unknown as { home_goals?: number }).home_goals ?? 0;
      const dbAwayGoals = (dbFixture as unknown as { away_goals?: number }).away_goals ?? 0;
      const statusChanged = fixture.status.short !== dbFixture.status_short;
      const goalsChanged =
        (item.goals.home ?? 0) !== dbHomeGoals ||
        (item.goals.away ?? 0) !== dbAwayGoals;

      if (statusChanged || goalsChanged) {
        await getDb().from("fixtures").upsert(
          {
            api_id: fixture.id,
            match_date_utc: new Date(fixture.date).toISOString(),
            match_date_local: null,
            status_short: fixture.status.short,
            status_long: fixture.status.long,
            round: (item.league as unknown as Record<string, unknown>).round as string | null ?? null,
            home_team_id: item.teams.home.id,
            away_team_id: item.teams.away.id,
            home_goals: item.goals.home,
            away_goals: item.goals.away,
            venue_id: fixture.venue?.id ?? null,
            league_id: item.league.id,
            season: SEASON,
            raw_payload: item as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "api_id" }
        );
        updatedCount++;
        updatedIds.push(fixture.id);
      }
    }

    await updateSyncLog(log.id, "completed", updatedCount);

    return {
      success: true,
      count: updatedCount,
      checked: fixturesToCheck.length,
      updatedIds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateSyncLog(log.id, "failed", 0, message);
    throw error;
  }
}

export async function syncStandings() {
  const log = await createSyncLog("standings");

  try {
    const { data: standingsData } = await getStandings(LEAGUE_ID, SEASON);

    let count = 0;

    for (const group of standingsData) {
      for (const standingsArray of group.standings) {
        for (const standing of standingsArray) {
          await getDb().from("standings").upsert(
            {
              season: SEASON,
              group_name: standing.group,
              team_id: standing.team.id,
              rank: standing.rank,
              points: standing.points,
              goals_diff: standing.goalsDiff,
              played: standing.all.played,
              won: standing.all.win,
              draw: standing.all.draw,
              lost: standing.all.lose,
              goals_for: standing.all.goals.for,
              goals_against: standing.all.goals.against,
              raw_payload: standing as unknown as Record<string, unknown>,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "season, group_name, team_id" }
          );
          count++;
        }
      }
    }

    await updateSyncLog(log.id, "completed", count);
    await updateSetting("last_standings_sync", new Date().toISOString());

    return { success: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateSyncLog(log.id, "failed", 0, message);
    throw error;
  }
}

interface SyncLogRow {
  id: string;
}

async function createSyncLog(syncType: string): Promise<SyncLogRow> {
  const { data, error } = await getDb()
    .from("api_sync_logs")
    .insert({
      sync_type: syncType,
      status: "started",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create sync log: ${error?.message}`);
  }

  return data as SyncLogRow;
}

async function updateSyncLog(
  id: string,
  status: string,
  recordsProcessed: number,
  errorMessage?: string
) {
  await getDb()
    .from("api_sync_logs")
    .update({
      status,
      records_processed: recordsProcessed,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function updateSetting(key: string, value: string) {
  await getDb()
    .from("app_settings")
    .update({
      value,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);
}
