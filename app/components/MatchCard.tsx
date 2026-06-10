import Link from "next/link";
import Image from "next/image";
import { formatTime, formatDate, formatMatchStatus } from "@/lib/utils";

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
  const isFinished = ["FT", "AET", "PEN", "AWD", "WO"].includes(fixture.status_short);
  const isLive = ["LIV", "HT", "BT"].includes(fixture.status_short);
  const isFuture = !isFinished && !isLive;

  const homeLogo = homeTeam?.logo ?? `/api/placeholder/40/40`;
  const awayLogo = awayTeam?.logo ?? `/api/placeholder/40/40`;

  return (
    <Link
      href={`/match-detail?id=${fixture.api_id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{fixture.round ? fixture.round.replace("Group ", "Grup ") : ""}</span>
        <span className={isLive ? "font-semibold text-red-600" : ""}>
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
          <span className="text-sm font-medium">{homeTeam?.name ?? "Local"}</span>
        </div>

        <div className="flex items-center gap-2">
          {isFinished || isLive ? (
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1 font-bold text-lg dark:bg-zinc-800">
              <span>{fixture.home_goals ?? 0}</span>
              <span className="text-zinc-400">-</span>
              <span>{fixture.away_goals ?? 0}</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="font-bold text-lg">{formatTime(date)}</div>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="text-sm font-medium">{awayTeam?.name ?? "Visitant"}</span>
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
