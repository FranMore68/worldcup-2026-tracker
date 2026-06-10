"use server";

import { z } from "zod";
import {
  ApiFootballResponseSchema,
  ApiFootballTeamWithVenueSchema,
  ApiFootballFixtureResponseSchema,
  ApiFootballStandingGroupSchema,
  ApiFootballEventSchema,
} from "@/types/schemas";

const API_URL = process.env.API_FOOTBALL_URL ?? "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;

function getApiKey(): string {
  if (!API_KEY) {
    throw new Error("API_FOOTBALL_KEY is not set");
  }
  return API_KEY;
}

async function apiFetch<T>(
  endpoint: string,
  schema: z.ZodSchema<T>,
  params?: Record<string, string | number | undefined>
): Promise<{ data: T[]; errors: string[]; results: number }> {
  const url = new URL(endpoint, API_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-apisports-key": getApiKey(),
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const rawJson = await response.json();

  const parsed = ApiFootballResponseSchema.safeParse(rawJson);

  if (!parsed.success) {
    throw new Error(`Invalid API response structure: ${parsed.error.message}`);
  }

  const apiResponse = parsed.data;

  const errors: string[] = [];
  if (Array.isArray(apiResponse.errors)) {
    errors.push(...apiResponse.errors);
  } else if (typeof apiResponse.errors === "object" && apiResponse.errors !== null) {
    errors.push(...Object.values(apiResponse.errors).filter((v): v is string => typeof v === "string"));
  }

  if (errors.length > 0) {
    throw new Error(`API-Football errors: ${errors.join(", ")}`);
  }

  const data = apiResponse.response.map((item) => schema.parse(item));

  return {
    data,
    errors,
    results: apiResponse.results,
  };
}

export async function getTeams(league: number = 1, season: number = 2026) {
  return apiFetch("/teams", ApiFootballTeamWithVenueSchema, { league, season });
}

export async function getFixtures(league: number = 1, season: number = 2026) {
  return apiFetch("/fixtures", ApiFootballFixtureResponseSchema, { league, season });
}

export async function getFixtureById(id: number) {
  return apiFetch("/fixtures", ApiFootballFixtureResponseSchema, { id });
}

export async function getStandings(league: number = 1, season: number = 2026) {
  return apiFetch("/standings", ApiFootballStandingGroupSchema, { league, season });
}

export async function getFixtureEvents(fixture: number) {
  return apiFetch("/fixtures/events", ApiFootballEventSchema, { fixture });
}

export async function getFixtureRounds(league: number = 1, season: number = 2026) {
  return apiFetch("/fixtures/rounds", z.object({ round: z.string() }), { league, season });
}
