import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Flag, Trophy, UserCog, Info } from "lucide-react";
import {
  getTeamByApiId,
  getFixturesByTeam,
  getAllTeams,
  getStandingForTeam,
  getEventsByTeam,
} from "@/lib/queries";
import MatchCard from "@/components/MatchCard";
import { getTeamLogoFallback } from "@/lib/utils";
import type { FixtureEvent } from "@/types/schemas";
import type { TeamFifaData, FifaSquadPlayer } from "@/types/fifa";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Equip - Mundial 2026",
};

// FIFA position codes
const POSITION_LABELS: Record<number, string> = {
  0: "Porters",
  1: "Defenses",
  2: "Migcampistes",
  3: "Davanters",
};

interface PlayerTally {
  goals: number;
  yellow: number;
  red: number;
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold">{message}</h1>
        <Link
          href="/groups"
          className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Tornar als grups
        </Link>
      </div>
    </div>
  );
}

function tallyEvents(events: FixtureEvent[]): {
  byPlayerId: Map<number, PlayerTally>;
  goalsByName: Map<string, number>;
} {
  const byPlayerId = new Map<number, PlayerTally>();
  const goalsByName = new Map<string, number>();

  const tally = (id: number): PlayerTally => {
    if (!byPlayerId.has(id)) byPlayerId.set(id, { goals: 0, yellow: 0, red: 0 });
    return byPlayerId.get(id)!;
  };

  for (const event of events) {
    if (event.event_type === "Goal" && event.detail !== "Own Goal") {
      if (event.player_id) tally(event.player_id).goals++;
      const name = event.player_name?.trim();
      if (name) goalsByName.set(name, (goalsByName.get(name) ?? 0) + 1);
    } else if (event.event_type === "Card" && event.player_id) {
      if (event.detail?.toLowerCase().includes("red")) tally(event.player_id).red++;
      else tally(event.player_id).yellow++;
    }
  }

  return { byPlayerId, goalsByName };
}

function PlayerRow({ player, tally }: { player: FifaSquadPlayer; tally: PlayerTally | null }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-7 shrink-0 text-center font-mono text-sm text-zinc-400">
        {player.number ?? "–"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{player.name}</span>
      <div className="flex shrink-0 items-center gap-2.5 text-sm">
        {tally && tally.goals > 0 && <span title="Gols">⚽ {tally.goals}</span>}
        {tally && tally.yellow > 0 && <span title="Targetes grogues">🟨 {tally.yellow}</span>}
        {tally && tally.red > 0 && <span title="Targetes vermelles">🟥 {tally.red}</span>}
      </div>
    </li>
  );
}

export default async function TeamDetailPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const idParam = searchParams.id;
  const id = idParam ? Number(idParam) : NaN;

  if (!idParam || Number.isNaN(id)) {
    return <NotFound message="Equip no especificat" />;
  }

  const [team, fixtures, allTeams, standing, events] = await Promise.all([
    getTeamByApiId(id).catch(() => null),
    getFixturesByTeam(id).catch(() => []),
    getAllTeams().catch(() => []),
    getStandingForTeam(id).catch(() => null),
    getEventsByTeam(id).catch(() => []),
  ]);

  if (!team) {
    return <NotFound message="Equip no trobat" />;
  }

  const teamMap = new Map(allTeams.map((t) => [t.api_id, t]));
  const fifa = (team.raw_payload as { fifa?: TeamFifaData })?.fifa ?? null;
  const squad = fifa?.squad ?? [];

  const { byPlayerId, goalsByName } = tallyEvents(events);

  const squadByPosition = new Map<number, FifaSquadPlayer[]>();
  for (const player of squad) {
    const key = player.position != null && POSITION_LABELS[player.position] ? player.position : 9;
    if (!squadByPosition.has(key)) squadByPosition.set(key, []);
    squadByPosition.get(key)!.push(player);
  }
  for (const list of squadByPosition.values()) {
    list.sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  }
  const positionKeys = [...squadByPosition.keys()].sort((a, b) => a - b);

  // When the squad is not synced yet, at least list the scorers we know about.
  const scorersWithoutSquad =
    squad.length === 0 ? [...goalsByName.entries()].sort((a, b) => b[1] - a[1]) : [];

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
          <Image
            src={team.logo ?? getTeamLogoFallback(team.name)}
            alt={team.name}
            width={80}
            height={80}
            className="rounded-full"
            unoptimized
          />
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              {team.country && (
                <span className="flex items-center gap-1">
                  <Flag className="h-3 w-3" />
                  {team.country}
                </span>
              )}
              {standing && (
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {standing.group_name} · {standing.rank}a posició · {standing.points ?? 0} punts
                </span>
              )}
            </div>
            {fifa?.coach && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                <UserCog className="h-4 w-4 text-emerald-600" />
                <span>
                  Seleccionador: <span className="font-medium">{fifa.coach}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Plantilla</h2>

        {squad.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p>
              La plantilla apareixerà automàticament quan l&apos;equip jugui el seu primer
              partit. Les targetes i els gols per jugador s&apos;actualitzen durant la
              competició.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {positionKeys.map((position) => (
              <div
                key={position}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  {POSITION_LABELS[position] ?? "Altres"}
                </div>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {squadByPosition.get(position)!.map((player) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      tally={byPlayerId.get(Number(player.id)) ?? null}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {scorersWithoutSquad.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold">Golejadors</h2>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {scorersWithoutSquad.map(([name, goals]) => (
                <li key={name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{name}</span>
                  <span>⚽ {goals}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {fixtures.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold">Partits</h2>
          <div className="flex flex-col gap-3">
            {fixtures.map((fixture) => (
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
