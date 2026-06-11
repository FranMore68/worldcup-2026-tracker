import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getSupabaseClient();
    const { data: fixtures } = await db.from("fixtures").select("api_id");
    const { data: teams } = await db.from("teams").select("api_id");

    return NextResponse.json({
      success: true,
      message: "Use this data for generateStaticParams",
      fixtureIds: fixtures?.map((f) => f.api_id) ?? [],
      teamIds: teams?.map((t) => t.api_id) ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
