import { Clock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Mundial Soccer 2026 Tracker
        </p>
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3 w-3" />
          <span>Actualitzat via API-Football</span>
        </div>
      </div>
    </footer>
  );
}
