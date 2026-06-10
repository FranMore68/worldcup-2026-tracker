import Image from "next/image";
import Link from "next/link";

interface TeamBadgeProps {
  apiId: number;
  name: string;
  logo: string | null;
  size?: number;
}

export default function TeamBadge({ apiId, name, logo, size = 32 }: TeamBadgeProps) {
  const src = logo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`;

  return (
    <Link
      href={`/team-detail?id=${apiId}`}
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full"
        unoptimized
      />
      <span className="text-sm font-medium">{name}</span>
    </Link>
  );
}
