import { Wand2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Logo } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { GamePlayer } from "@/games/game-player";
import { getGame } from "@/lib/api";

// Rendered on first visit, then served from the full-route cache (published configs are immutable).
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

const getPublished = cache(async (id: string) => {
  const game = await getGame(id);
  return game?.status === "published" ? game : null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const game = await getPublished((await params).id);
  if (!game) return { title: "Game not found" };
  const { title, intro } = game.config;
  return { title, description: intro, openGraph: { title, description: intro, type: "website" } };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const game = await getPublished((await params).id);
  if (!game) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Button asChild size="sm" variant="outline">
          <Link href="/builder">
            <Wand2 /> Make your own
          </Link>
        </Button>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-10 sm:px-6">
        <GamePlayer config={game.config} />
      </main>
    </div>
  );
}
