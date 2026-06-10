"use server";

import { getSupabaseClient } from "./supabase";
import { Team, Venue, Fixture, Standing, SyncLog } from "@/types/schemas";

function getDb() {
  return getSupabaseClient();
}

export async function getAllTeams(): Promise<Team[]> {
  const { data, error } = await getDb()
    .from("teams")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Team[];
}

export async function getTeamByApiId(apiId: number): Promise<Team & { venues?: Venue | null }> {
  const { data, error } = await getDb()
    .from("teams")
    .select("*, venues(*)")
    .eq("api_id", apiId)
    .single();

  if (error) throw new Error(error.message);
  return data as Team & { venues?: Venue | null };
}

export async function getAllFixtures(): Promise<Fixture[]> {
  const { data, error } = await getDb()
    .from("fixtures")
    .select("*")
    .order("match_date_utc", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Fixture[];
}

export async function getFixturesByDate(date: string): Promise<Fixture[]> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  const { data, error } = await getDb()
    .from("fixtures")
    .select("*")
    .gte("match_date_utc", start.toISOString())
    .lte("match_date_utc", end.toISOString())
    .order("match_date_utc");

  if (error) throw new Error(error.message);
  return (data ?? []) as Fixture[];
}

export async function getTodayFixtures(): Promise<Fixture[]> {
  const today = new Date().toISOString().split("T")[0];
  return getFixturesByDate(today);
}

export async function getFixtureByApiId(apiId: number): Promise<Fixture> {
  const { data, error } = await getDb()
    .from("fixtures")
    .select("*")
    .eq("api_id", apiId)
    .single();

  if (error) throw new Error(error.message);
  return data as Fixture;
}

export async function getAllStandings(): Promise<(Standing & { teams?: Team | null })[]> {
  const { data, error } = await getDb()
    .from("standings")
    .select("*, teams(*)")
    .order("group_name")
    .order("rank");

  if (error) throw new Error(error.message);
  return (data ?? []) as (Standing & { teams?: Team | null })[];
}

export async function getSyncStatus(): Promise<{ key: string; value: string | null }[]> {
  const { data, error } = await getDb()
    .from("app_settings")
    .select("*")
    .in("key", [
      "last_fixtures_sync",
      "last_teams_sync",
      "last_standings_sync",
    ]);

  if (error) throw new Error(error.message);
  return (data ?? []) as { key: string; value: string | null }[];
}

export async function getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
  const { data, error } = await getDb()
    .from("api_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as SyncLog[];
}
