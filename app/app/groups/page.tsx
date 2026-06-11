import { getAllStandings, getAllTeams } from "@/lib/queries";
import { formatGroupName } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Grups - Mundial 2026",
};

export default async function GroupsPage() {
  const [standings, teams] = await Promise.all([
    getAllStandings().catch(() => []),
    getAllTeams().catch(() => []),
  ]);

  const teamMap = new Map(teams.map((t) => [t.api_id, t]));

  const groups = standings.reduce(
    (acc: Record<string, typeof standings[number][]>, standing) => {
      if (!acc[standing.group_name]) acc[standing.group_name] = [];
      acc[standing.group_name].push(standing);
      return acc;
    },
    {} as Record<string, typeof standings[number][]>
  );

  const sortedGroups = Object.keys(groups).sort();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Classificació per grups</h1>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full bg-emerald-500" />
          Classificat per a setzens
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full bg-amber-400" />
          Possible classificat (8 millors tercers)
        </span>
      </div>

      {sortedGroups.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">
            No hi ha dades de classificació disponibles.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {sortedGroups.map((groupName) => (
          <section
            key={groupName}
            className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="font-bold text-lg">
                {formatGroupName(groupName)}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-4 py-2 text-left w-10">#</th>
                    <th className="px-4 py-2 text-left">Equip</th>
                    <th className="px-4 py-2 text-center w-10">PJ</th>
                    <th className="px-4 py-2 text-center w-10">V</th>
                    <th className="px-4 py-2 text-center w-10">E</th>
                    <th className="px-4 py-2 text-center w-10">D</th>
                    <th className="px-4 py-2 text-center w-12">GF</th>
                    <th className="px-4 py-2 text-center w-12">GC</th>
                    <th className="px-4 py-2 text-center w-12">DG</th>
                    <th className="px-4 py-2 text-center w-12">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groups[groupName]
                    .sort((a, b) => a.rank - b.rank)
                    .map((standing) => {
                      const team = teamMap.get(standing.team_id);
                      return (
                        <tr
                          key={standing.id}
                          className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3 font-medium">
                            <span className="flex items-center gap-2">
                              <span
                                className={`h-5 w-1 rounded-full ${
                                  standing.rank <= 2
                                    ? "bg-emerald-500"
                                    : standing.rank === 3
                                      ? "bg-amber-400"
                                      : "bg-transparent"
                                }`}
                              />
                              {standing.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/team-detail?id=${standing.team_id}`}
                              className="flex items-center gap-2"
                            >
                              {team?.logo && (
                                <Image
                                  src={team.logo}
                                  alt={team.name}
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                  unoptimized
                                />
                              )}
                              <span className="font-medium">
                                {team?.name ?? "Equip"}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {standing.played ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {standing.won ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {standing.draw ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {standing.lost ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {standing.goals_for ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {standing.goals_against ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {standing.goals_diff ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {standing.points ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
