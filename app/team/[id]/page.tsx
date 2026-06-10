import { getTeamByApiId, getAllFixtures, getAllTeams } from "@/lib/queries";
import { formatDateTime, formatMatchStatus } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import { ArrowLeft, Flag, Calendar } from "lucide-react";

interface TeamPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params;
  const teamId = Number(id);

  const [team, allFixtures, allTeams] = await Promise.all([
    getTeamByApiId(teamId).catch(() => null),
    getAllFixtures().catch(() => []),
    getAllTeams().catch(() => []),
  ]);

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold">Equip no trobat</h1>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Tornar a l inici
          </Link>
        </div>
      </div>
    );
  }

  const teamFixtures = allFixtures.filter(
    (f) => f.home_team_id === teamId || f.away_team_id === teamId
  );

  const teamMap = new Map(allTeams.map((t) => [t.api_id, t]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/groups"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Tornar als grups
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4 p-6">
          {team.logo && (
            <Image
              src={team.logo}
              alt={team.name}
              width={80}
              height={80}
              className="rounded-full"
              unoptimized
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              {team.country && (
                <span className="flex items-center gap-1">
                  <Flag className="h-3 w-3" />
                  {team.country}
                </span>
              )}
              {team.founded && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fundat {team.founded}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {teamFixtures.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-bold">Partits</h2>
          <div className="flex flex-col gap-3">
            {teamFixtures.map((fixture) => (
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
    </div>
  );
}
