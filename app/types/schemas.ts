import { z } from "zod";

// ============================================
// Database Types (from Supabase schema)
// Data source: OpenLigaDB (wm26/2026)
// ============================================

export const TeamSchema = z.object({
  id: z.number(),
  api_id: z.number(),
  name: z.string(),
  code: z.string().nullable(),
  country: z.string().nullable(),
  founded: z.number().nullable(),
  national: z.boolean().nullable(),
  logo: z.string().nullable(),
  venue_id: z.number().nullable(),
  raw_payload: z.record(z.string(), z.unknown()),
  synced_at: z.string().nullable(),
  created_at: z.string().nullable(),
});

export const VenueSchema = z.object({
  id: z.number(),
  api_id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  capacity: z.number().nullable(),
  surface: z.string().nullable(),
  image: z.string().nullable(),
  raw_payload: z.record(z.string(), z.unknown()),
  synced_at: z.string().nullable(),
  created_at: z.string().nullable(),
});

export const FixtureSchema = z.object({
  id: z.number(),
  api_id: z.number(),
  match_date_utc: z.string(),
  match_date_local: z.string().nullable(),
  status_short: z.string(),
  status_long: z.string().nullable(),
  round: z.string().nullable(),
  home_team_id: z.number(),
  away_team_id: z.number(),
  home_goals: z.number().nullable(),
  away_goals: z.number().nullable(),
  // Knockout penalty shootout scores. Null when the match did not go to penalties.
  home_penalty_goals: z.number().nullable(),
  away_penalty_goals: z.number().nullable(),
  venue_id: z.number().nullable(),
  league_id: z.number().nullable(),
  season: z.number().nullable(),
  // Who owns this fixture row: "openligadb" or "fifa". OpenLigaDB wins on
  // structural data (api_id, teams, round) because it has stable IDs; FIFA is
  // the authoritative real-time layer for score/status/events.
  owner: z.string().nullable(),
  raw_payload: z.record(z.string(), z.unknown()),
  synced_at: z.string().nullable(),
  created_at: z.string().nullable(),
});

export const StandingSchema = z.object({
  id: z.number(),
  season: z.number(),
  group_name: z.string(),
  team_id: z.number(),
  rank: z.number(),
  points: z.number().nullable(),
  goals_diff: z.number().nullable(),
  played: z.number().nullable(),
  won: z.number().nullable(),
  draw: z.number().nullable(),
  lost: z.number().nullable(),
  goals_for: z.number().nullable(),
  goals_against: z.number().nullable(),
  raw_payload: z.record(z.string(), z.unknown()),
  synced_at: z.string().nullable(),
  created_at: z.string().nullable(),
});

export const FixtureEventSchema = z.object({
  id: z.number(),
  fixture_id: z.number(),
  event_type: z.string(),
  elapsed: z.number().nullable(),
  extra_time: z.number().nullable(),
  team_id: z.number().nullable(),
  player_id: z.number().nullable(),
  player_name: z.string().nullable(),
  assist_id: z.number().nullable(),
  assist_name: z.string().nullable(),
  detail: z.string().nullable(),
  comments: z.string().nullable(),
  raw_payload: z.record(z.string(), z.unknown()),
  synced_at: z.string().nullable(),
  created_at: z.string().nullable(),
});

export const SyncLogSchema = z.object({
  id: z.string().uuid(),
  sync_type: z.string(),
  status: z.string(),
  records_processed: z.number().nullable(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  raw_request: z.record(z.string(), z.unknown()).nullable(),
  raw_response: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().nullable(),
});

export type Team = z.infer<typeof TeamSchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;
export type Standing = z.infer<typeof StandingSchema>;
export type SyncLog = z.infer<typeof SyncLogSchema>;
export type FixtureEvent = z.infer<typeof FixtureEventSchema>;
