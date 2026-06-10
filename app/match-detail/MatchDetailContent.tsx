"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDateTime, formatMatchStatus } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, MapPin } from "lucide-react";

interface Team {
  api_id: number;
  name: string;
  logo: string | null;
}

interface Fixture {
  api_id: number;
  match_date_utc: string;
  status_short: string;
  status_long: string | null;
  round: string | null;
  home_team_id: number;
  away_team_id: number;
  home_goals: number | null;
  away_goals: number | null;
  raw_payload: Record<string, unknown>;
}

export default function MatchDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [fixtureRes, teamsRes] = await Promise.all([
          fetch(`/api/data/fixture?id=${id}`),
          fetch(`/api/data/teams`),
        ]);

        const fixtureData = await fixtureRes.json();
        const teamsData = await teamsRes.json();

        setFixture(fixtureData);
        setTeams(teamsData);
      } catch (err) {
        console.error("Error loading match:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          Carregant partit...
        </div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold">Partit no trobat</h1>
          <Link href="/calendar" className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Tornar al calendari
          </Link>
        </div>
      </div>
    );
  }

  const homeTeam = teams.find((t) => t.api_id === fixture.home_team_id);
  const awayTeam = teams.find((t) => t.api_id === fixture.away_team_id);

  const raw = fixture.raw_payload as {
    fixture?: { venue?: { name?: string; city?: string }; referee?: string };
  };

  const venueName = raw?.fixture?.venue?.name;
  const venueCity = raw?.fixture?.venue?.city;
  const referee = raw?.fixture?.referee;

  const isFinished = ["FT", "AET", "PEN", "AWD", "WO"].includes(fixture.status_short);
  const isLive = ["LIV", "HT", "BT"].includes(fixture.status_short);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/calendar" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Tornar al calendari
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {fixture.round ? fixture.round.replace("Group ", "Grup ") : ""}
            </span>
            <StatusBadge status={fixture.status_short} />
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col items-center gap-3">
              {homeTeam?.logo && (
                <Image src={homeTeam.logo} alt={homeTeam.name} width={64} height={64} className="rounded-full" unoptimized />
              )}
              <Link href={`/team-detail?id=${fixture.home_team_id}`} className="text-center font-bold hover:text-emerald-600">
                {homeTeam?.name ?? "Local"}
              </Link>
            </div>

            <div className="flex flex-col items-center">
              {isFinished || isLive ? (
                <div className="flex items-center gap-3 text-3xl font-bold">
                  <span>{fixture.home_goals ?? 0}</span>
                  <span className="text-zinc-400">-</span>
                  <span>{fixture.away_goals ?? 0}</span>
                </div>
              ) : (
                <div className="text-2xl font-bold">VS</div>
              )}
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {formatMatchStatus(fixture.status_short)}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center gap-3">
              {awayTeam?.logo && (
                <Image src={awayTeam.logo} alt={awayTeam.name} width={64} height={64} className="rounded-full" unoptimized />
              )}
              <Link href={`/team-detail?id=${fixture.away_team_id}`} className="text-center font-bold hover:text-emerald-600">
                {awayTeam?.name ?? "Visitant"}
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <div>{formatDateTime(fixture.match_date_utc)}</div>
            {venueName && (
              <div className="mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{venueName}{venueCity && `, ${venueCity}`}</span>
              </div>
            )}
            {referee && <div className="mt-1">Àrbitre: {referee}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
