import Link from "next/link";
import Image from "next/image";
import {
  formatTime,
  formatDate,
  formatMatchStatus,
  formatRound,
  isFinishedStatus,
  isLiveStatus,
} from "@/lib/utils";

interface MatchCardProps {
  fixture: {
    api_id: number;
    match_date_utc: string;
    status_short: string;
    home_team_id: number;
    away_team_id: number;
    home_goals: number | null;
    away_goals: number | null;
    round: string | null;
  };
  homeTeam: {
    name: string;
    logo: string | null;
  } | null;
  awayTeam: {
    name: string;
    logo: string | null;
  } | null;
}

export default function MatchCard({ fixture, homeTeam, awayTeam }: MatchCardProps) {
  const date = new Date(fixture.match_date_utc);
  const isFinished = isFinishedStatus(fixture.status_short);
  const isLive = isLiveStatus(fixture.status_short);
  const isFuture = !isFinished && !isLive;

  const homeLogo = homeTeam?.logo ?? `/api/placeholder/40/40`;
  const awayLogo = awayTeam?.logo ?? `/api/placeholder/40/40`;

  const homeGoals = fixture.home_goals ?? 0;
  const awayGoals = fixture.away_goals ?? 0;
  const homeWins = isFinished && homeGoals > awayGoals;
  const awayWins = isFinished && awayGoals > homeGoals;

  return (
    <Link
      href={`/match-detail?id=${fixture.api_id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-500 hover:shadow-md active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{formatRound(fixture.round)}</span>
        <span className={isLive ? "flex items-center gap-1.5 font-semibold text-red-600" : ""}>
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
          )}
          {formatMatchStatus(fixture.status_short)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <Image
            src={homeLogo}
            alt={homeTeam?.name ?? "Local"}
            width={32}
            height={32}
            className="rounded-full"
            unoptimized
          />
          <span className={`text-sm ${homeWins ? "font-bold" : "font-medium"}`}>
            {homeTeam?.name ?? "Per determinar"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isFinished || isLive ? (
            <div
              className={`flex items-center gap-1 rounded-lg px-3 py-1 font-bold text-lg ${
                isLive
                  ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              <span>{homeGoals}</span>
              <span className="text-zinc-400">-</span>
              <span>{awayGoals}</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="font-bold text-lg">{formatTime(date)}</div>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className={`text-right text-sm ${awayWins ? "font-bold" : "font-medium"}`}>
            {awayTeam?.name ?? "Per determinar"}
          </span>
          <Image
            src={awayLogo}
            alt={awayTeam?.name ?? "Visitant"}
            width={32}
            height={32}
            className="rounded-full"
            unoptimized
          />
        </div>
      </div>

      {isFuture && (
        <div className="mt-2 text-center text-xs text-zinc-400">
          {formatDate(date)}
        </div>
      )}
    </Link>
  );
}
