"use client";

import { AnimatePresence } from "framer-motion";
import { Loader2, Play, RotateCcw, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { GameConfig, TemplateId } from "@/lib/types";
import { cn } from "@/lib/utils";

import { type EngineProps, type GameResult, paletteVars, playerNames, winnersOf } from "./shared";

const loading = () => (
  <div className="grid min-h-64 place-items-center text-muted">
    <Loader2 className="size-6 animate-spin" />
  </div>
);

// One chunk per engine: a quiz never downloads Phaser, a runner never downloads the board AI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENGINES: Record<TemplateId, React.ComponentType<EngineProps<any>>> = {
  quiz: dynamic(() => import("./quiz"), { ssr: false, loading }),
  memory: dynamic(() => import("./memory"), { ssr: false, loading }),
  word: dynamic(() => import("./word"), { ssr: false, loading }),
  runner: dynamic(() => import("./runner"), { ssr: false, loading }),
  board: dynamic(() => import("./board"), { ssr: false, loading }),
};

type Phase = { kind: "intro" } | { kind: "playing"; round: number } | { kind: "done"; round: number; result: GameResult };

export function GamePlayer({ config, className }: { config: GameConfig; className?: string }) {
  const Engine = ENGINES[config.template];
  const players = useMemo(() => playerNames(config.players), [config.players]);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const round = phase.kind === "intro" ? 0 : phase.round;

  const onFinish = useCallback((result: GameResult) => setPhase({ kind: "done", round, result }), [round]);

  return (
    <div
      style={paletteVars(config.palette)}
      className={cn("glass relative overflow-hidden rounded-2xl p-4 sm:p-6", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-3/4 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "linear-gradient(90deg, var(--gp), var(--gs))" }}
      />
      <AnimatePresence mode="wait">
        {phase.kind === "intro" && (
          <m.div
            key="intro"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative flex min-h-72 flex-col items-center justify-center gap-4 py-8 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--gp)", textShadow: "0 0 24px var(--gp)" }}>
              {config.title}
            </h2>
            <p className="max-w-md text-muted">{config.intro}</p>
            <p className="font-mono text-xs text-muted">
              {config.players} player{config.players > 1 ? "s" : ""}
              {config.players > 1 && " · pass the device on your turn"}
            </p>
            <Button size="lg" onClick={() => setPhase({ kind: "playing", round: 1 })} autoFocus>
              <Play /> Play
            </Button>
          </m.div>
        )}

        {phase.kind === "playing" && (
          <m.div key={`play-${phase.round}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
            <Engine config={config} players={players} onFinish={onFinish} />
          </m.div>
        )}

        {phase.kind === "done" && (
          <EndScreen
            key="done"
            players={players}
            result={phase.result}
            vsCpu={config.template === "board" && config.players === 1}
            onRestart={() => setPhase({ kind: "playing", round: phase.round + 1 })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EndScreen({
  players,
  result,
  vsCpu,
  onRestart,
}: {
  players: string[];
  result: GameResult;
  vsCpu: boolean;
  onRestart: () => void;
}) {
  const names = vsCpu ? [...players, "CPU"] : players;
  const winners = winnersOf(result);
  const ranking = names.map((name, i) => ({ name, score: result.scores[i] ?? 0, i })).sort((a, b) => b.score - a.score);
  const headline =
    names.length === 1
      ? "Game over"
      : winners.length > 1
        ? "It's a tie!"
        : vsCpu && winners[0] === 1
          ? "The CPU wins"
          : `${names[winners[0]]} wins!`;

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex min-h-72 flex-col items-center justify-center gap-5 py-8 text-center"
    >
      <m.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.1 }}>
        <Trophy className="size-12" style={{ color: "var(--ga)", filter: "drop-shadow(0 0 12px var(--ga))" }} />
      </m.div>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{headline}</h2>
        {result.detail && <p className="mt-1 text-muted">{result.detail}</p>}
      </div>
      {names.length > 1 && (
        <ol className="w-full max-w-xs space-y-2">
          {ranking.map((r, rank) => (
            <li
              key={r.name}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-2 text-sm",
                winners.includes(r.i) ? "border-[var(--ga)] bg-[var(--ga)]/10" : "border-white/10",
              )}
            >
              <span>
                <span className="mr-2 font-mono text-muted">{rank + 1}</span>
                {r.name}
              </span>
              <span className="font-mono tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
      {names.length === 1 && <p className="font-mono text-4xl font-bold text-gradient">{result.scores[0]}</p>}
      <Button onClick={onRestart} variant="outline" autoFocus>
        <RotateCcw /> Play again
      </Button>
    </m.div>
  );
}
