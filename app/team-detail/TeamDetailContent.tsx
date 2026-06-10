"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MatchCard from "@/components/MatchCard";
import { ArrowLeft, Flag, Calendar } from "lucide-react";

interface Team {
  api_id: number;
  name: string;
  logo: string | null;
  country: string | null;
  founded: number | null;
}

interface Fixture {
  api_id: number;
  match_date_utc: string;
  status_short: string;
  home_team_id: number;
  away_team_id: number;
  home_goals: number | null;
  away_goals: number | null;
  round: string | null;
}

export default function TeamDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [team, setTeam] = useState<Team | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [teamRes, fixturesRes, teamsRes] = await Promise.all([
          fetch(`/api/data/team?id=${id}`),
          fetch(`/api/data/fixtures?teamId=${id}`),
          fetch(`/api/data/teams`),
        ]);

        const teamData = await teamRes.json();
        const fixturesData = await fixturesRes.json();
        const teamsData = await teamsRes.json();

        setTeam(teamData);
        setFixtures(fixturesData);
        setAllTeams(teamsData);
      } catch (err) {
        console.error("Error loading team:", err);
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
          Carregant equip...
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold">Equip no trobat</h1>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Tornar a l inici
          </Link>
        </div>
      </div>
    );
  }

  const teamMap = new Map(allTeams.map((t) => [t.api_id, t]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/groups" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Tornar als grups
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4 p-6">
          {team.logo && (
            <Image src={team.logo} alt={team.name} width={80} height={80} className="rounded-full" unoptimized />
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

      {fixtures.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-bold">Partits</h2>
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
