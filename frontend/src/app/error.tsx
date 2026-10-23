"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="glass flex max-w-sm flex-col items-center gap-4 rounded-2xl p-8">
        <p className="text-2xl font-bold">Something glitched.</p>
        <p className="text-muted">The game server didn&rsquo;t answer. Give it another try.</p>
        <Button onClick={reset}>Retry</Button>
      </div>
    </main>
  );
}
