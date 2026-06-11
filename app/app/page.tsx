import {
  getAllFixtures,
  getAllTeams,
  getTodayFixtures,
  getSyncStatus,
  getRecentResults,
} from "@/lib/queries";
import MatchCard from "@/components/MatchCard";
import AutoRefresh from "@/components/AutoRefresh";
import { formatDateTime, isFinishedStatus, isLiveStatus } from "@/lib/utils";
import { Calendar, Trophy, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [fixtures, teams, todayFixtures, syncStatus, recentResults] = await Promise.all([
    getAllFixtures().catch(() => []),
    getAllTeams().catch(() => []),
    getTodayFixtures().catch(() => []),
    getSyncStatus().catch(() => []),
    getRecentResults(5).catch(() => []),
  ]);

  const teamMap = new Map(teams.map((t) => [t.api_id, t]));

  const liveFixtures = todayFixtures.filter((f) => isLiveStatus(f.status_short));
  const todayPending = todayFixtures.filter(
    (f) => !isLiveStatus(f.status_short) && !isFinishedStatus(f.status_short)
  );
  const todayFinished = todayFixtures.filter((f) => isFinishedStatus(f.status_short));

  const todayIds = new Set(todayFixtures.map((f) => f.api_id));
  const upcomingFixtures = fixtures
    .filter(
      (f) =>
        !isFinishedStatus(f.status_short) &&
        !isLiveStatus(f.status_short) &&
        !todayIds.has(f.api_id) &&
        new Date(f.match_date_utc) > new Date()
    )
    .slice(0, 5);

  const lastSync = syncStatus.find((s) => s.key === "last_fixtures_sync")?.value;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {(liveFixtures.length > 0 || todayPending.length > 0) && (
        <AutoRefresh intervalSeconds={liveFixtures.length > 0 ? 60 : 300} />
      )}

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Mundial de Futbol 2026</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Segueix tots els partits, grups i resultats en català
        </p>
        {lastSync && (
          <p className="mt-1 text-xs text-zinc-400">
            Última actualització: {formatDateTime(lastSync)}
          </p>
        )}
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
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
          <Users className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium">Grups</span>
        </Link>
        <Link
          href="/knockout"
          className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Trophy className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium">Eliminatòries</span>
        </Link>
      </div>

      {liveFixtures.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            En directe
          </h2>
          <div className="flex flex-col gap-3">
            {liveFixtures.map((fixture) => (
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

      {(todayPending.length > 0 || todayFinished.length > 0) && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Partits d&apos;avui</h2>
          <div className="flex flex-col gap-3">
            {[...todayFinished, ...todayPending].map((fixture) => (
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
        <section className="mb-8">
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

      {recentResults.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Últims resultats</h2>
          <div className="flex flex-col gap-3">
            {recentResults.map((fixture) => (
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
            Encara no hi ha dades sincronitzades. Executa la sincronització des del panell d&apos;administració.
          </p>
        </div>
      )}
    </div>
  );
}
