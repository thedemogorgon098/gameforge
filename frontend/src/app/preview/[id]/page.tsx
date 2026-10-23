import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FadeIn } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { GamePlayer } from "@/games/game-player";
import { getGame } from "@/lib/api";
import { TEMPLATE_BY_ID } from "@/lib/templates";

import { PublishPanel } from "./publish-panel";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGame(id, { fresh: true });
  if (!game) notFound();

  const meta = TEMPLATE_BY_ID[game.template];
  const { request } = game;
  const remix = `/builder?template=${game.template}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[1fr_340px]">
        <FadeIn className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="-ml-3">
              <Link href={remix}>
                <ArrowLeft /> Builder
              </Link>
            </Button>
            <Badge>
              {meta.emoji} {meta.name}
            </Badge>
            <Badge className={game.status === "published" ? "border-emerald-400/40 text-emerald-300" : undefined}>
              {game.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <GamePlayer config={game.config} />
        </FadeIn>

        <FadeIn delay={0.1} className="flex flex-col gap-4">
          <PublishPanel id={game.id} initialUrl={game.url} />

          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Theme</dt>
                <dd>{request.theme}</dd>
                <dt className="text-muted">Players</dt>
                <dd>{request.players}</dd>
                <dt className="text-muted">Rules</dt>
                <dd className="break-words">{request.rules || "—"}</dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between p-6 text-lg font-semibold tracking-tight">
                Config JSON
                <span className="text-sm font-normal text-muted transition-transform group-open:rotate-90">›</span>
              </summary>
              <pre className="max-h-96 overflow-auto border-t border-white/5 p-4 font-mono text-xs leading-relaxed text-neon-cyan/90">
                {JSON.stringify(game.config, null, 2)}
              </pre>
            </details>
          </Card>
        </FadeIn>
      </main>
    </>
  );
}
