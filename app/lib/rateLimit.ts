"use server";

import { getSupabaseClient } from "./supabase";

const DAILY_LIMIT = 100;

export async function getApiCallsRemaining(): Promise<number> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "api_rate_limit_remaining")
    .single();

  if (error || !data?.value) {
    return DAILY_LIMIT;
  }

  const remaining = parseInt(data.value, 10);
  return isNaN(remaining) ? DAILY_LIMIT : remaining;
}

export async function decrementApiCalls(count: number = 1): Promise<number> {
  const db = getSupabaseClient();
  const current = await getApiCallsRemaining();
  const next = Math.max(0, current - count);

  await db
    .from("app_settings")
    .update({ value: String(next), updated_at: new Date().toISOString() })
    .eq("key", "api_rate_limit_remaining");

  return next;
}

export async function resetApiCalls(): Promise<void> {
  const db = getSupabaseClient();
  await db
    .from("app_settings")
    .update({ value: String(DAILY_LIMIT), updated_at: new Date().toISOString() })
    .eq("key", "api_rate_limit_remaining");
}

export async function canMakeApiCalls(required: number = 1): Promise<boolean> {
  const remaining = await getApiCallsRemaining();
  return remaining >= required;
}
