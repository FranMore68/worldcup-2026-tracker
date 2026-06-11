import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Users, User } from "lucide-react";
import { getFixtureByApiId, getFixtureEvents, getAllTeams } from "@/lib/queries";
import {
  formatDateTime,
  formatRound,
  isFinishedStatus,
  isLiveStatus,
} from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import AutoRefresh from "@/components/AutoRefresh";
import MatchTimeline, { TimelineEvent } from "./MatchTimeline";
import type { FixtureEvent } from "@/types/schemas";
import type { FixtureFifaData } from "@/types/fifa";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partit - Mundial 2026",
};

interface OpenLigaRawPayload {
  source?: string;
  original?: {
    location?: { locationCity?: string | null; locationStadium?: string | null } | null;
    numberOfViewers?: number | null;
    matchResults?: Array<{
      resultTypeID: number;
      pointsTeam1: number;
      pointsTeam2: number;
    }>;
    goals?: Array<{
      scoreTeam1: number;
      scoreTeam2: number;
      matchMinute: number | null;
      goalGetterName: string;
      isPenalty: boolean;
      isOwnGoal: boolean;
      isOvertime: boolean;
    }>;
    team1?: { teamId: number };
    team2?: { teamId: number };
  };
  fifa?: FixtureFifaData;
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold">{message}</h1>
        <Link
          href="/calendar"
          className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Tornar al calendari
        </Link>
      </div>
    </div>
  );
}

function eventsFromTable(events: FixtureEvent[]): TimelineEvent[] {
  return events.map((e) => ({
    minute: e.elapsed,
    extraTime: e.extra_time,
    teamId: e.team_id,
    playerName: e.player_name,
    assistName: e.assist_name,
    type: e.event_type,
    detail: e.detail,
  }));
}

function eventsFromRawGoals(raw: OpenLigaRawPayload): TimelineEvent[] {
  const original = raw.original;
  if (!original?.goals?.length || !original.team1 || !original.team2) return [];

  const homeTeamId = original.team1.teamId;
  const awayTeamId = original.team2.teamId;

  let prevHome = 0;
  return original.goals.map((goal) => {
    const homeScored = goal.scoreTeam1 > prevHome;
    prevHome = goal.scoreTeam1;
    return {
      minute: goal.matchMinute,
      extraTime: null,
      teamId: homeScored ? homeTeamId : awayTeamId,
      playerName: goal.goalGetterName?.trim() || null,
      assistName: null,
      type: "Goal",
      detail: goal.isOwnGoal ? "Own Goal" : goal.isPenalty ? "Penalty" : "Normal Goal",
    };
  });
}

export default async function MatchDetailPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const idParam = searchParams.id;
  const id = idParam ? Number(idParam) : NaN;

  if (!idParam || Number.isNaN(id)) {
    return <NotFound message="Partit no especificat" />;
  }

  const [fixture, teams, dbEvents] = await Promise.all([
    getFixtureByApiId(id).catch(() => null),
    getAllTeams().catch(() => []),
    getFixtureEvents(id).catch(() => []),
  ]);

  if (!fixture) {
    return <NotFound message="Partit no trobat" />;
  }

  const homeTeam = teams.find((t) => t.api_id === fixture.home_team_id) ?? null;
  const awayTeam = teams.find((t) => t.api_id === fixture.away_team_id) ?? null;

  const raw = fixture.raw_payload as OpenLigaRawPayload;

  const stadium = raw?.fifa?.stadium ?? raw?.original?.location?.locationStadium ?? null;
  const city = raw?.fifa?.city ?? raw?.original?.location?.locationCity ?? null;
  const referee = raw?.fifa?.referee ?? null;
  const viewers = raw?.fifa?.attendance ?? raw?.original?.numberOfViewers ?? null;
  const halftime = raw?.original?.matchResults?.find((r) => r.resultTypeID === 1) ?? null;

  const isFinished = isFinishedStatus(fixture.status_short);
  const isLive = isLiveStatus(fixture.status_short);
  const hasStarted = isFinished || isLive;

  const events: TimelineEvent[] =
    dbEvents.length > 0 ? eventsFromTable(dbEvents) : eventsFromRawGoals(raw);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {isLive && <AutoRefresh intervalSeconds={45} />}

      <Link
        href="/calendar"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Tornar al calendari
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatRound(fixture.round)}
            </span>
            <StatusBadge status={fixture.status_short} />
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col items-center gap-3">
              {homeTeam?.logo && (
                <Image
                  src={homeTeam.logo}
                  alt={homeTeam.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <Link
                href={`/team-detail?id=${fixture.home_team_id}`}
                className="text-center font-bold hover:text-emerald-600"
              >
                {homeTeam?.name ?? "Per determinar"}
              </Link>
            </div>

            <div className="flex flex-col items-center">
              {hasStarted ? (
                <div
                  className={`flex items-center gap-3 text-4xl font-bold ${
                    isLive ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  <span>{fixture.home_goals ?? 0}</span>
                  <span className="text-zinc-400">-</span>
                  <span>{fixture.away_goals ?? 0}</span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-zinc-400">VS</div>
              )}
              {halftime && hasStarted && (
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Descans: {halftime.pointsTeam1} - {halftime.pointsTeam2}
                </div>
              )}
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {fixture.status_long ?? ""}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center gap-3">
              {awayTeam?.logo && (
                <Image
                  src={awayTeam.logo}
                  alt={awayTeam.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <Link
                href={`/team-detail?id=${fixture.away_team_id}`}
                className="text-center font-bold hover:text-emerald-600"
              >
                {awayTeam?.name ?? "Per determinar"}
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
            <div>{formatDateTime(fixture.match_date_utc)}</div>
            {stadium && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  {stadium}
                  {city && `, ${city}`}
                </span>
              </div>
            )}
            {referee && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Àrbitre: {referee}</span>
              </div>
            )}
            {viewers != null && viewers > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{viewers.toLocaleString("ca-ES")} espectadors</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasStarted && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Cronologia del partit</h2>
          <MatchTimeline
            events={events}
            homeTeamId={fixture.home_team_id}
            homeTeamName={homeTeam?.name ?? "Local"}
            awayTeamName={awayTeam?.name ?? "Visitant"}
          />
        </section>
      )}
    </div>
  );
}
