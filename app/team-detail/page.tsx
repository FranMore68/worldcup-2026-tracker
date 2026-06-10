import { Suspense } from "react";
import TeamDetailContent from "./TeamDetailContent";

export const dynamic = "force-dynamic";

export default function TeamDetailPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          Carregant equip...
        </div>
      </div>
    }>
      <TeamDetailContent />
    </Suspense>
  );
}
