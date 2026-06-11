import Link from "next/link";
import { Calendar, Trophy, Home, Shield, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Inici", icon: Home },
  { href: "/calendar", label: "Calendari", icon: Calendar },
  { href: "/groups", label: "Grups", icon: Users },
  { href: "/knockout", label: "Eliminatòries", icon: Trophy },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" />
          <span className="hidden text-lg font-bold min-[480px]:inline">Mundial 2026</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
