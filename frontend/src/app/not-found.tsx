import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="glass flex max-w-sm flex-col items-center gap-4 rounded-2xl p-8">
        <p className="font-mono text-5xl font-bold text-gradient">404</p>
        <p className="text-muted">This game doesn&rsquo;t exist or hasn&rsquo;t been published yet.</p>
        <Button asChild>
          <Link href="/builder">Forge a new one</Link>
        </Button>
      </div>
    </main>
  );
}
