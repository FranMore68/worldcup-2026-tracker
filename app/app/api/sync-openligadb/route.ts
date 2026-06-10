import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getOpenLigaMatches } from "@/lib/openLigaDb";

const SYNC_SECRET = process.env.SYNC_SECRET;

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

function extractGoals(match: any): { homeGoals: number | null; awayGoals: number | null; status: string } {
  if (match.matchIsFinished) {
    // Find final result
    const finalResult = match.matchResults?.find(
      (r: any) => r.resultTypeID === 2
    );
    if (finalResult) {
      return {
        homeGoals: finalResult.pointsTeam1,
        awayGoals: finalResult.pointsTeam2,
        status: "FT",
      };
    }
  }

  if (match.goals && match.goals.length > 0) {
    const lastGoal = match.goals[match.goals.length - 1];
    return {
      homeGoals: lastGoal.scoreTeam1,
      awayGoals: lastGoal.scoreTeam2,
      status: "LIV",
    };
  }

  return {
    homeGoals: null,
    awayGoals: null,
    status: match.matchIsFinished ? "FT" : "NS",
  };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!SYNC_SECRET) {
    return NextResponse.json({ error: "SYNC_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { type?: string };
  const type = body.type ?? "all";

  try {
    const db = getSupabaseClient();
    const allMatches = await getOpenLigaMatches(2026);

    const results: Record<string, unknown> = {};

    if (type === "all" || type === "teams") {
      const teamMap = new Map<
        number,
        { teamId: number; teamName: string; shortName: string; teamIconUrl: string | null }
      >();

      for (const match of allMatches) {
        [match.team1, match.team2].forEach((t) => {
          if (!teamMap.has(t.teamId)) teamMap.set(t.teamId, t);
        });
      }

      for (const [id, team] of teamMap) {
        const ca = TEAM_NAME_DE_TO_CA[team.teamName] || { name: team.teamName, country: team.teamName };
        const { error } = await db.from("teams").upsert(
          {
            api_id: id,
            name: ca.name,
            code: team.shortName,
            country: ca.country,
            founded: null,
            national: true,
            logo: team.teamIconUrl || null,
            venue_id: null,
            raw_payload: { source: "openligadb", original: team },
            synced_at: new Date().toISOString(),
          },
          { onConflict: "api_id" }
        );
        if (error) console.error("Team error:", error.message);
      }

      results.teams = { success: true, count: teamMap.size };
    }

    if (type === "all" || type === "fixtures" || type === "live") {
      const matchesToSync = type === "live"
        ? allMatches.filter((m) => {
            const today = new Date().toISOString().split("T")[0];
            return m.matchDateTimeUTC.startsWith(today);
          })
        : allMatches;

      let updated = 0;
      for (const match of matchesToSync) {
        const group = getGroupForMatch(match.team1.teamId, match.team2.teamId);
        const round = `${group} - Jornada ${match.group?.groupOrderID || 1}`;
        const { homeGoals, awayGoals, status } = extractGoals(match);

        const { data: existing } = await db
          .from("fixtures")
          .select("status_short")
          .eq("api_id", match.matchID)
          .single();

        // Only sync if status changed or has goals
        const needsUpdate =
          !existing ||
          existing.status_short !== status ||
          (homeGoals !== null && awayGoals !== null);

        if (needsUpdate) {
          const { error } = await db.from("fixtures").upsert(
            {
              api_id: match.matchID,
              match_date_utc: new Date(match.matchDateTimeUTC).toISOString(),
              match_date_local: match.matchDateTime,
              status_short: status,
              status_long: status === "FT" ? "Finalitzat" : status === "LIV" ? "En directe" : "No començat",
              round,
              home_team_id: match.team1.teamId,
              away_team_id: match.team2.teamId,
              home_goals: homeGoals,
              away_goals: awayGoals,
              venue_id: null,
              league_id: 1,
              season: 2026,
              raw_payload: { source: "openligadb", original: match },
              synced_at: new Date().toISOString(),
            },
            { onConflict: "api_id" }
          );
          if (error) {
            console.error("Fixture error:", error.message);
          } else {
            updated++;
          }
        }
      }

      results.fixtures = { success: true, count: matchesToSync.length, updated };
    }

    if (type === "all" || type === "standings") {
      // Get all fixtures to calculate standings
      const { data: fixtures } = await db
        .from("fixtures")
        .select("*")
        .eq("season", 2026)
        .eq("status_short", "FT");

      // Reset standings
      for (const [group, teamIds] of Object.entries(GROUPS)) {
        for (const teamId of teamIds) {
          await db.from("standings").upsert(
            {
              season: 2026,
              group_name: group,
              team_id: teamId,
              rank: 1,
              points: 0,
              goals_diff: 0,
              played: 0,
              won: 0,
              draw: 0,
              lost: 0,
              goals_for: 0,
              goals_against: 0,
              raw_payload: { source: "openligadb", calculated: false },
              synced_at: new Date().toISOString(),
            },
            { onConflict: "season, group_name, team_id" }
          );
        }
      }

      // Calculate standings
      const standings: Record<
        string,
        Record<
          number,
          { played: number; won: number; draw: number; lost: number; gf: number; ga: number; points: number }
        >
      > = {};

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

      // Update standings in DB
      for (const [group, teams] of Object.entries(standings)) {
        const sorted = Object.entries(teams).sort((a, b) => {
          if (b[1].points !== a[1].points) return b[1].points - a[1].points;
          const diffB = b[1].gf - b[1].ga;
          const diffA = a[1].gf - a[1].ga;
          return diffB - diffA;
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

      results.standings = { success: true, groups: Object.keys(standings).length };
    }

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
