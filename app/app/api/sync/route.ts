import { NextRequest, NextResponse } from "next/server";
import { syncFixtures, syncTeams, syncStandings } from "@/lib/sync";

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!SYNC_SECRET) {
    return NextResponse.json(
      { error: "SYNC_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { type?: string };
    const type = body.type ?? "all";

    const results: Record<string, unknown> = {};

    if (type === "all" || type === "teams") {
      results.teams = await syncTeams();
    }

    if (type === "all" || type === "fixtures") {
      results.fixtures = await syncFixtures();
    }

    if (type === "all" || type === "standings") {
      results.standings = await syncStandings();
    }

    return NextResponse.json({
      success: true,
      syncs: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
