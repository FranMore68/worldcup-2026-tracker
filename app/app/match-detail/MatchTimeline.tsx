export interface TimelineEvent {
  minute: number | null;
  extraTime: number | null;
  teamId: number | null;
  playerName: string | null;
  assistName: string | null;
  type: string;
  detail: string | null;
}

function eventIcon(event: TimelineEvent): string {
  if (event.type === "Goal") return "⚽";
  if (event.type === "Penalty Shootout") {
    if (event.detail?.toLowerCase().includes("missed")) return "❌";
    return "🥅";
  }
  if (event.type === "Card") {
    if (event.detail?.toLowerCase().includes("red")) return "🟥";
    return "🟨";
  }
  if (event.type === "subst" || event.type === "Substitution") return "🔁";
  return "•";
}

function eventDescription(event: TimelineEvent): string {
  const player = event.playerName ?? "Jugador desconegut";

  if (event.type === "Goal") {
    // OpenLigaDB publishes scorer names with some delay after each goal.
    const who = event.playerName ?? "Gol";
    if (event.detail === "Penalty") return `${who} (de penal)`;
    if (event.detail === "Own Goal") return `${who} (pròpia porta)`;
    if (event.detail === "Missed Penalty") return `${who} (penal fallat)`;
    return who;
  }

  if (event.type === "Penalty Shootout") {
    const action = event.detail?.toLowerCase().includes("missed")
      ? "falla el penal"
      : "marca el penal";
    return `${player} (${action})`;
  }

  if (event.type === "Card") {
    const card = event.detail?.toLowerCase().includes("red")
      ? "Targeta vermella"
      : "Targeta groga";
    return `${card} per a ${player}`;
  }

  if (event.type === "subst" || event.type === "Substitution") {
    return event.assistName ? `Entra ${event.assistName}, surt ${player}` : `Canvi: ${player}`;
  }

  return player;
}

function minuteLabel(event: TimelineEvent): string {
  if (event.minute == null) return "–";
  return event.extraTime ? `${event.minute}+${event.extraTime}'` : `${event.minute}'`;
}

interface MatchTimelineProps {
  events: TimelineEvent[];
  homeTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}

export default function MatchTimeline({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName,
}: MatchTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Encara no hi ha incidències registrades en aquest partit.
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      (a.minute ?? 0) + (a.extraTime ?? 0) / 100 - ((b.minute ?? 0) + (b.extraTime ?? 0) / 100)
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span>{homeTeamName}</span>
        <span>{awayTeamName}</span>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sorted.map((event, index) => {
          const isHome = event.teamId === homeTeamId;
          return (
            <li key={index} className="flex items-center gap-2 px-4 py-2.5 text-sm">
              {isHome ? (
                <>
                  <span className="w-12 shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {minuteLabel(event)}
                  </span>
                  <span className="shrink-0">{eventIcon(event)}</span>
                  <span className="flex-1 truncate">{eventDescription(event)}</span>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-right">{eventDescription(event)}</span>
                  <span className="shrink-0">{eventIcon(event)}</span>
                  <span className="w-12 shrink-0 text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {minuteLabel(event)}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
