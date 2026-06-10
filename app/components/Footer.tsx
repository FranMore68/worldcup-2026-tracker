export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          © 2026 moremaker3d
        </p>
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Actualitzat via OpenLigaDB</span>
        </div>
      </div>
    </footer>
  );
}
