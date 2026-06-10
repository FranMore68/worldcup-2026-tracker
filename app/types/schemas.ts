import { z } from "zod";

// ============================================
// API-Football Response Schemas
// ============================================

export const ApiFootballTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string().nullable(),
  country: z.string().nullable(),
  founded: z.number().nullable(),
  national: z.boolean().nullable(),
  logo: z.string().nullable(),
});

export const ApiFootballVenueSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  capacity: z.number().nullable(),
  surface: z.string().nullable(),
  image: z.string().nullable(),
});

export const ApiFootballTeamWithVenueSchema = z.object({
  team: ApiFootballTeamSchema,
  venue: ApiFootballVenueSchema,
});

export const ApiFootballLeagueSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  logo: z.string().nullable(),
});

export const ApiFootballSeasonSchema = z.object({
  year: z.number(),
  start: z.string(),
  end: z.string(),
  current: z.boolean(),
});

export const ApiFootballLeagueResponseSchema = z.object({
  league: ApiFootballLeagueSchema,
  country: z.object({
    name: z.string(),
    code: z.string().nullable(),
    flag: z.string().nullable(),
  }),
  seasons: z.array(ApiFootballSeasonSchema),
});

export const ApiFootballStatusSchema = z.object({
  long: z.string(),
  short: z.string(),
  elapsed: z.number().nullable(),
  extra: z.number().nullable(),
});

export const ApiFootballScoreSchema = z.object({
  home: z.number().nullable(),
  away: z.number().nullable(),
});

export const ApiFootballGoalsSchema = z.object({
  home: z.number().nullable(),
  away: z.number().nullable(),
});

export const ApiFootballFixtureSchema = z.object({
  id: z.number(),
  referee: z.string().nullable(),
  timezone: z.string(),
  date: z.string(),
  timestamp: z.number(),
  periods: z.object({
    first: z.number().nullable(),
    second: z.number().nullable(),
  }),
  venue: z.object({
    id: z.number().nullable(),
    name: z.string().nullable(),
    city: z.string().nullable(),
  }),
  status: ApiFootballStatusSchema,
});

export const ApiFootballFixtureResponseSchema = z.object({
  fixture: ApiFootballFixtureSchema,
  league: ApiFootballLeagueSchema,
  teams: z.object({
    home: z.object({
      id: z.number(),
      name: z.string(),
      logo: z.string().nullable(),
      winner: z.boolean().nullable(),
    }),
    away: z.object({
      id: z.number(),
      name: z.string(),
      logo: z.string().nullable(),
      winner: z.boolean().nullable(),
    }),
  }),
  goals: ApiFootballGoalsSchema,
  score: z.object({
    halftime: ApiFootballScoreSchema,
    fulltime: ApiFootballScoreSchema,
    extratime: ApiFootballScoreSchema.nullable(),
    penalty: ApiFootballScoreSchema.nullable(),
  }),
});

export const ApiFootballStandingSchema = z.object({
  rank: z.number(),
  team: z.object({
    id: z.number(),
    name: z.string(),
    logo: z.string().nullable(),
  }),
  points: z.number(),
  goalsDiff: z.number(),
  group: z.string(),
  form: z.string().nullable(),
  status: z.string().nullable(),
  description: z.string().nullable(),
  all: z.object({
    played: z.number(),
    win: z.number(),
    draw: z.number(),
    lose: z.number(),
    goals: z.object({
      for: z.number(),
      against: z.number(),
    }),
  }),
  home: z.object({
    played: z.number(),
    win: z.number(),
    draw: z.number(),
    lose: z.number(),
    goals: z.object({
      for: z.number(),
      against: z.number(),
    }),
  }),
  away: z.object({
    played: z.number(),
    win: z.number(),
    draw: z.number(),
    lose: z.number(),
    goals: z.object({
      for: z.number(),
      against: z.number(),
    }),
  }),
  update: z.string(),
});

export const ApiFootballStandingGroupSchema = z.object({
  league: ApiFootballLeagueSchema,
  season: z.number(),
  standings: z.array(z.array(ApiFootballStandingSchema)),
});

export const ApiFootballEventSchema = z.object({
  time: z.object({
    elapsed: z.number(),
    extra: z.number().nullable(),
  }),
  team: z.object({
    id: z.number(),
    name: z.string(),
    logo: z.string().nullable(),
  }),
  player: z.object({
    id: z.number().nullable(),
    name: z.string().nullable(),
  }),
  assist: z.object({
    id: z.number().nullable(),
    name: z.string().nullable(),
  }),
  type: z.string(),
  detail: z.string(),
  comments: z.string().nullable(),
});

export const ApiFootballResponseSchema = z.object({
  get: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.string()).or(z.record(z.string(), z.unknown())).optional(),
  results: z.number(),
  paging: z
    .object({
      current: z.number(),
      total: z.number(),
    })
    .optional(),
  response: z.array(z.unknown()),
});

// ============================================
// Database Types (from Supabase schema)
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
  venue_id: z.number().nullable(),
  league_id: z.number().nullable(),
  season: z.number().nullable(),
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

export type ApiFootballTeam = z.infer<typeof ApiFootballTeamSchema>;
export type ApiFootballVenue = z.infer<typeof ApiFootballVenueSchema>;
export type ApiFootballFixture = z.infer<typeof ApiFootballFixtureResponseSchema>;
export type ApiFootballStanding = z.infer<typeof ApiFootballStandingSchema>;
export type ApiFootballEvent = z.infer<typeof ApiFootballEventSchema>;
export type ApiFootballResponse = z.infer<typeof ApiFootballResponseSchema>;

export type Team = z.infer<typeof TeamSchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;
export type Standing = z.infer<typeof StandingSchema>;
export type SyncLog = z.infer<typeof SyncLogSchema>;
