"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  intervalSeconds?: number;
}

/**
 * Re-fetches the current server component tree on an interval.
 * Rendered only while there is live (or imminent) data to keep fresh.
 */
export default function AutoRefresh({ intervalSeconds = 60 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [router, intervalSeconds]);

  return null;
}
