import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SYNC_SECRET = process.env.SYNC_SECRET;

// Seed rewrites every team, fixture and standing, so it is a destructive
// operation: gate it behind the same secret as the sync endpoints.
function isAuthorized(request: NextRequest): boolean {
  if (!SYNC_SECRET) return false;
  if (request.headers.get("authorization") === `Bearer ${SYNC_SECRET}`) return true;
  return request.nextUrl.searchParams.get("secret") === SYNC_SECRET;
}

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

export async function GET(request: NextRequest) {
  if (!SYNC_SECRET) {
    return NextResponse.json({ error: "SYNC_SECRET not configured" }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseClient();

  try {
    let allMatches: unknown[] = [];

    // Try fetching entire season at once
    const resAll = await fetch("https://api.openligadb.de/getmatchdata/wm26/2026", { next: { revalidate: 0 } });
    if (resAll.ok) {
      const data = (await resAll.json()) as unknown[];
      if (Array.isArray(data) && data.length > 0) {
        allMatches = data;
      }
    }

    // Fallback: iterate matchdays
    if (allMatches.length === 0) {
      for (let matchday = 1; matchday <= 20; matchday++) {
        const res = await fetch(`https://api.openligadb.de/getmatchdata/wm26/2026/${matchday}`, { next: { revalidate: 0 } });
        if (!res.ok) break;
        const data = (await res.json()) as unknown[];
        if (!Array.isArray(data) || data.length === 0) break;
        allMatches.push(...data);
      }
    }

    if (allMatches.length === 0) {
      return NextResponse.json({ error: "No matches found from OpenLigaDB" }, { status: 500 });
    }

    // Extract unique teams
    const teamMap = new Map<number, { teamId: number; teamName: string; shortName: string; teamIconUrl: string }>();
    interface SeedTeam { teamId: number; teamName: string; shortName: string; teamIconUrl: string }
    for (const match of allMatches as Array<{ team1: SeedTeam; team2: SeedTeam }>) {
      [match.team1, match.team2].forEach((t) => {
        if (!teamMap.has(t.teamId)) teamMap.set(t.teamId, t);
      });
    }

    // Insert teams
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
      if (error) console.error("Team insert error:", error.message);
    }

    // Insert fixtures
    for (const match of allMatches as Array<{
      matchID: number;
      matchDateTimeUTC: string;
      matchDateTime: string;
      matchIsFinished: boolean;
      team1: { teamId: number };
      team2: { teamId: number };
      group?: { groupOrderID?: number };
    }>) {
      const group = getGroupForMatch(match.team1.teamId, match.team2.teamId);
      const round = `${group} - Jornada ${match.group?.groupOrderID || 1}`;

      const { error } = await db.from("fixtures").upsert(
        {
          api_id: match.matchID,
          match_date_utc: new Date(match.matchDateTimeUTC).toISOString(),
          match_date_local: match.matchDateTime,
          status_short: match.matchIsFinished ? "FT" : "NS",
          status_long: match.matchIsFinished ? "Finalitzat" : "No començat",
          round,
          home_team_id: match.team1.teamId,
          away_team_id: match.team2.teamId,
          home_goals: null,
          away_goals: null,
          venue_id: null,
          league_id: 1,
          season: 2026,
          raw_payload: { source: "openligadb", original: match },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "api_id" }
      );
      if (error) console.error("Fixture insert error:", error.message);
    }

    // Insert initial standings
    for (const [group, teamIds] of Object.entries(GROUPS)) {
      for (let i = 0; i < teamIds.length; i++) {
        const teamId = teamIds[i];
        const { error } = await db.from("standings").upsert(
          {
            season: 2026,
            group_name: group,
            team_id: teamId,
            rank: i + 1,
            points: 0,
            goals_diff: 0,
            played: 0,
            won: 0,
            draw: 0,
            lost: 0,
            goals_for: 0,
            goals_against: 0,
            raw_payload: { source: "seed", group, teamId },
            synced_at: new Date().toISOString(),
          },
          { onConflict: "season, group_name, team_id" }
        );
        if (error) console.error("Standing insert error:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      teams: teamMap.size,
      matches: allMatches.length,
      groups: Object.keys(GROUPS).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
