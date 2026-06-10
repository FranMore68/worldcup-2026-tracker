import { getAllFixtures, getAllTeams, getTodayFixtures, getSyncStatus } from "@/lib/queries";
import MatchCard from "@/components/MatchCard";
import { formatDate } from "@/lib/utils";
import { Calendar, Trophy, Activity } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const [fixtures, teams, todayFixtures, syncStatus] = await Promise.all([
    getAllFixtures().catch(() => []),
    getAllTeams().catch(() => []),
    getTodayFixtures().catch(() => []),
    getSyncStatus().catch(() => []),
  ]);

  const teamMap = new Map(teams.map((t) => [t.api_id, t]));

  const upcomingFixtures = fixtures
    .filter((f) => !["FT", "AET", "PEN", "AWD", "WO"].includes(f.status_short))
    .slice(0, 5);

  const lastSync = syncStatus.find((s) => s.key === "last_fixtures_sync")?.value;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Mundial de Futbol 2026</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Segueix tots els partits, grups i resultats en català
        </p>
        {lastSync && (
          <p className="mt-1 text-xs text-zinc-400">
            Última actualització: {formatDate(lastSync)}
          </p>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Link
          href="/calendar"
          className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Calendar className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium">Calendari</span>
        </Link>
        <Link
          href="/groups"
          className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Trophy className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium">Grups</span>
        </Link>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Activity className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium">{teams.length} Equips</span>
        </div>
      </div>

      {todayFixtures.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Partits d avui</h2>
          <div className="flex flex-col gap-3">
            {todayFixtures.map((fixture) => (
              <MatchCard
                key={fixture.api_id}
                fixture={fixture}
                homeTeam={teamMap.get(fixture.home_team_id) ?? null}
                awayTeam={teamMap.get(fixture.away_team_id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {upcomingFixtures.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Pròxims partits</h2>
          <div className="flex flex-col gap-3">
            {upcomingFixtures.map((fixture) => (
              <MatchCard
                key={fixture.api_id}
                fixture={fixture}
                homeTeam={teamMap.get(fixture.home_team_id) ?? null}
                awayTeam={teamMap.get(fixture.away_team_id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {fixtures.length === 0 && teams.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">
            Encara no hi ha dades sincronitzades. Executa la sincronització des del panell d administració.
          </p>
        </div>
      )}
    </div>
  );
}
