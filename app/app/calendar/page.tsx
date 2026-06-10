import { getAllFixtures, getAllTeams } from "@/lib/queries";
import MatchCard from "@/components/MatchCard";
import { formatDate } from "@/lib/utils";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Calendari de partits</h1>

      {sortedDates.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">No hi ha partits programats.</p>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {sortedDates.map((date) => (
          <section key={date}>
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              {formatDate(date)}
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
        ))}
      </div>
    </div>
  );
}
