import { NextRequest, NextResponse } from "next/server";
import { syncFixtures, syncStandings, syncTeams, syncLive } from "@/lib/sync";
import { getApiCallsRemaining, canMakeApiCalls, decrementApiCalls } from "@/lib/rateLimit";
import { getAllFixtures } from "@/lib/queries";

const SYNC_SECRET = process.env.SYNC_SECRET;
const DAILY_LIMIT = 100;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!SYNC_SECRET) {
    return NextResponse.json(
      { error: "SYNC_SECRET not configured" },
      { status: 500 }
    );
  }

  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "auto";
  const remainingBefore = await getApiCallsRemaining();

  if (remainingBefore <= 0) {
    return NextResponse.json(
      {
        success: false,
        reason: "Rate limit exceeded",
        remaining: 0,
        limit: DAILY_LIMIT,
      },
      { status: 429 }
    );
  }

  try {
    const result: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      type,
      api_calls_remaining_before: remainingBefore,
    };

    // Smart auto mode: decides what to sync based on current state
    if (type === "auto") {
      const fixtures = await getAllFixtures();
      const today = new Date().toISOString().split("T")[0];
      const todayStart = new Date(today);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setUTCHours(23, 59, 59, 999);

      const todaysFixtures = fixtures.filter(
        (f) => {
          const d = new Date(f.match_date_utc);
          return d >= todayStart && d <= todayEnd;
        }
      );

      const hasLive = todaysFixtures.some(
        (f) => ["LIV", "HT", "BT", "NS"].includes(f.status_short)
      );

      const needsDailySync = remainingBefore >= 80;

      if (hasLive) {
        // Live mode: sync fixtures only, skip standings
        if (await canMakeApiCalls(1)) {
          result.live = await syncLive();
          await decrementApiCalls(1);
        } else {
          result.skipped = "No API calls remaining for live sync";
        }
      } else if (needsDailySync) {
        // Daily full sync
        if (await canMakeApiCalls(3)) {
          result.teams = await syncTeams();
          await decrementApiCalls(1);
          result.fixtures = await syncFixtures();
          await decrementApiCalls(1);
          result.standings = await syncStandings();
          await decrementApiCalls(1);
        } else {
          result.skipped = "Not enough API calls for full sync";
        }
      } else {
        result.skipped = "No action needed (no live matches, daily sync already done)";
      }
    }

    // Explicit manual types
    else if (type === "fixtures") {
      if (await canMakeApiCalls(1)) {
        result.fixtures = await syncFixtures();
        await decrementApiCalls(1);
      } else {
        result.skipped = "No API calls remaining";
      }
    }

    else if (type === "standings") {
      if (await canMakeApiCalls(1)) {
        result.standings = await syncStandings();
        await decrementApiCalls(1);
      } else {
        result.skipped = "No API calls remaining";
      }
    }

    else if (type === "teams") {
      if (await canMakeApiCalls(1)) {
        result.teams = await syncTeams();
        await decrementApiCalls(1);
      } else {
        result.skipped = "No API calls remaining";
      }
    }

    else if (type === "live") {
      if (await canMakeApiCalls(1)) {
        result.live = await syncLive();
        await decrementApiCalls(1);
      } else {
        result.skipped = "No API calls remaining";
      }
    }

    else if (type === "all") {
      if (await canMakeApiCalls(3)) {
        result.teams = await syncTeams();
        await decrementApiCalls(1);
        result.fixtures = await syncFixtures();
        await decrementApiCalls(1);
        result.standings = await syncStandings();
        await decrementApiCalls(1);
      } else {
        result.skipped = "Not enough API calls remaining (need 3, have " + remainingBefore + ")";
      }
    }

    else {
      return NextResponse.json(
        { error: "Invalid type. Use: auto, fixtures, standings, teams, live, all" },
        { status: 400 }
      );
    }

    const remainingAfter = await getApiCallsRemaining();
    result.api_calls_remaining_after = remainingAfter;
    result.api_calls_consumed = remainingBefore - remainingAfter;

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
