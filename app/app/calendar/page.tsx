import Link from "next/link";
import { getAllFixtures, getAllTeams } from "@/lib/queries";
import MatchCard from "@/components/MatchCard";
import { formatDate } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendari - Mundial 2026",
};

export default async function CalendarPage() {
  const [fixtures, teams] = await Promise.all([
    getAllFixtures().catch(() => []),
    getAllTeams().catch(() => []),
  ]);

  const teamMap = new Map(teams.map((t) => [t.api_id, t]));

  const fixturesByDate = fixtures.reduce(
    (acc: Record<string, typeof fixtures[number][]>, fixture) => {
      const dateKey = new Date(fixture.match_date_utc).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(fixture);
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(fixturesByDate).sort();
  const today = new Date().toISOString().split("T")[0];
  const hasToday = sortedDates.includes(today);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calendari de partits</h1>
        {hasToday && (
          <a
            href="#avui"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <CalendarCheck className="h-4 w-4" />
            Avui
          </a>
        )}
      </div>

      {sortedDates.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">No hi ha partits programats.</p>
          <Link href="/" className="mt-2 inline-block text-sm text-emerald-600 hover:underline">
            Tornar a l&apos;inici
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {sortedDates.map((date) => {
          const isToday = date === today;
          return (
            <section
              key={date}
              id={isToday ? "avui" : undefined}
              className="scroll-mt-20"
            >
              <h2
                className={`mb-3 flex items-center gap-2 text-lg font-semibold ${
                  isToday
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {formatDate(date)}
                {isToday && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Avui
                  </span>
                )}
              </h2>
              <div className="flex flex-col gap-3">
                {fixturesByDate[date].map((fixture) => (
                  <MatchCard
                    key={fixture.api_id}
                    fixture={fixture}
                    homeTeam={teamMap.get(fixture.home_team_id) ?? null}
                    awayTeam={teamMap.get(fixture.away_team_id) ?? null}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
