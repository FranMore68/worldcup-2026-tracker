import Link from "next/link";
import Image from "next/image";
import { Shield } from "lucide-react";
import { getAllFixtures, getAllTeams, getLiveFixtures } from "@/lib/queries";
import { KNOCKOUT_STAGES, getKnockoutStageKey, KnockoutStageKey } from "@/lib/rounds";
import { formatTime, isFinishedStatus, isLiveStatus } from "@/lib/utils";
import AutoRefresh from "@/components/AutoRefresh";
import type { Fixture, Team } from "@/types/schemas";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Eliminatòries - Mundial 2026",
};

function shortDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.toLocaleDateString("ca-ES", { day: "numeric", month: "numeric", timeZone: "Europe/Madrid" });
  return `${day}, ${formatTime(date)}`;
}

function TeamLine({
  team,
  goals,
  penaltyGoals,
  winner,
}: {
  team: Team | null;
  goals: number | null;
  penaltyGoals: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex min-w-0 items-center gap-2">
        {team?.logo ? (
          <Image
            src={team.logo}
            alt={team.name}
            width={20}
            height={20}
            className="shrink-0 rounded-full"
            unoptimized
          />
        ) : (
          <Shield className="h-5 w-5 shrink-0 text-zinc-300 dark:text-zinc-600" />
        )}
        <span
          className={`truncate text-sm ${
            team
              ? winner
                ? "font-bold"
                : "font-medium"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {team?.name ?? "Per determinar"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {penaltyGoals != null && (
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            ({penaltyGoals})
          </span>
        )}
        {goals != null && (
          <span className={`text-sm tabular-nums ${winner ? "font-bold" : ""}`}>{goals}</span>
        )}
      </div>
    </div>
  );
}

function BracketCard({
  fixture,
  teamMap,
}: {
  fixture: Fixture | null;
  teamMap: Map<number, Team>;
}) {
  if (!fixture) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs text-zinc-400 dark:text-zinc-500">Data per confirmar</div>
        <TeamLine team={null} goals={null} penaltyGoals={null} winner={false} />
        <TeamLine team={null} goals={null} penaltyGoals={null} winner={false} />
      </div>
    );
  }

  const isFinished = isFinishedStatus(fixture.status_short);
  const isLive = isLiveStatus(fixture.status_short);
  const showScore = isFinished || isLive;
  const homeGoals = showScore ? fixture.home_goals ?? 0 : null;
  const awayGoals = showScore ? fixture.away_goals ?? 0 : null;
  const homePenalties = fixture.home_penalty_goals ?? null;
  const awayPenalties = fixture.away_penalty_goals ?? null;
  const wentToPenalties = homePenalties != null && awayPenalties != null;

  // In a knockout shootout the winner is decided by penalties when they exist,
  // otherwise by regular/extra time goals.
  const homeWins = isFinished && (
    wentToPenalties
      ? homePenalties > awayPenalties
      : (homeGoals ?? 0) > (awayGoals ?? 0)
  );
  const awayWins = isFinished && (
    wentToPenalties
      ? awayPenalties > homePenalties
      : (awayGoals ?? 0) > (homeGoals ?? 0)
  );

  return (
    <Link
      href={`/match-detail?id=${fixture.api_id}`}
      className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>{shortDate(fixture.match_date_utc)}</span>
        {wentToPenalties && (
          <span className="font-medium text-zinc-500 dark:text-zinc-400">Penals</span>
        )}
        {isLive && (
          <span className="flex items-center gap-1 font-semibold text-red-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
            </span>
            En directe
          </span>
        )}
      </div>
      <TeamLine
        team={teamMap.get(fixture.home_team_id) ?? null}
        goals={homeGoals}
        penaltyGoals={wentToPenalties ? homePenalties : null}
        winner={homeWins}
      />
      <TeamLine
        team={teamMap.get(fixture.away_team_id) ?? null}
        goals={awayGoals}
        penaltyGoals={wentToPenalties ? awayPenalties : null}
        winner={awayWins}
      />
    </Link>
  );
}

export default async function KnockoutPage() {
  const [fixtures, teams, liveFixtures] = await Promise.all([
    getAllFixtures().catch(() => []),
    getAllTeams().catch(() => []),
    getLiveFixtures().catch(() => []),
  ]);

  const teamMap = new Map(teams.map((t) => [t.api_id, t]));

  // Knockout fixtures grouped by stage. The "Finale" matchday disambiguation
  // (final vs 3rd place) compares kickoff times within the same matchday.
  const byStage = new Map<KnockoutStageKey, Fixture[]>();
  const koFixtures = fixtures.filter((f) => getKnockoutStageKey(f) !== null);
  const finalDayKickoffs = koFixtures
    .filter((f) => ["F", "TP"].includes(getKnockoutStageKey(f) ?? ""))
    .map((f) => f.match_date_utc)
    .sort();
  const lastFinalKickoff = finalDayKickoffs[finalDayKickoffs.length - 1];

  for (const fixture of koFixtures) {
    const provisional = getKnockoutStageKey(fixture)!;
    const key: KnockoutStageKey =
      provisional === "F" || provisional === "TP"
        ? fixture.match_date_utc === lastFinalKickoff || finalDayKickoffs.length <= 1
          ? "F"
          : "TP"
        : provisional;

    if (!byStage.has(key)) byStage.set(key, []);
    byStage.get(key)!.push(fixture);
  }

  for (const list of byStage.values()) {
    list.sort((a, b) => a.match_date_utc.localeCompare(b.match_date_utc));
  }

  return (
    <div className="px-4 py-8">
      {liveFixtures.length > 0 && <AutoRefresh intervalSeconds={60} />}

      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-2xl font-bold">Eliminatòries</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          El quadre s&apos;anirà omplint a mesura que avanci la competició.
        </p>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {KNOCKOUT_STAGES.map((stage) => {
              const stageFixtures = byStage.get(stage.key) ?? [];
              const slots: (Fixture | null)[] = [];
              for (let i = 0; i < Math.max(stage.size, stageFixtures.length); i++) {
                slots.push(stageFixtures[i] ?? null);
              }

              return (
                <div key={stage.key} className="flex w-64 shrink-0 flex-col">
                  <h2 className="mb-3 text-center text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {stage.label}
                  </h2>
                  <div className="flex flex-1 flex-col justify-around gap-3">
                    {slots.map((fixture, index) => (
                      <BracketCard
                        key={fixture?.api_id ?? `${stage.key}-${index}`}
                        fixture={fixture}
                        teamMap={teamMap}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
