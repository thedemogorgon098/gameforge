import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-neon-cyan to-neon-violet text-sm text-white shadow-[0_0_18px_-2px_var(--color-neon-cyan)] transition-transform group-hover:rotate-6">
        GF
      </span>
      <span>
        GameForge <span className="text-gradient">AI</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Button asChild size="sm">
          <Link href="/builder">Create a game</Link>
        </Button>
      </div>
    </header>
  );
}
