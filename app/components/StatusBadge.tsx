interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    NS: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    TBD: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    LIV: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse",
    HT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    FT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    AET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    PEN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    PST: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    CANC: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const style = statusStyles[status] ?? statusStyles.NS;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
