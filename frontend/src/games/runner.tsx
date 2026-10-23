"use client";

import { Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RunnerConfig } from "@/lib/types";

import { RUNNER_HEIGHT, RUNNER_WIDTH, type RunnerHandle, startRunner } from "./runner-scene";
import { type EngineProps, Scoreboard } from "./shared";

type Phase = "ready" | "loading" | "running";

export default function RunnerGame({ config, players, onFinish }: EngineProps<RunnerConfig>) {
  const mount = useRef<HTMLDivElement>(null);
  const handle = useRef<RunnerHandle | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState<number[]>(() => players.map(() => 0));
  const [lastRun, setLastRun] = useState<string | null>(null);

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      handle.current?.destroy();
      handle.current = null;
    };
  }, []);

  const run = async () => {
    if (!mount.current || phase !== "ready") return;
    setPhase("loading");
    const current = turn;
    let ended = false;
    const h = await startRunner(mount.current, config, (score, reachedTarget) => {
      if (ended) return;
      ended = true;
      handle.current?.destroy();
      handle.current = null;
      const next = scores.map((s, i) => (i === current ? score : s));
      setScores(next);
      if (current === players.length - 1) {
        const detail =
          players.length === 1 ? (reachedTarget ? `Target reached — ${score} pts` : `${score} points`) : undefined;
        onFinish({ scores: next, detail });
        return;
      }
      setLastRun(`${players[current]} scored ${score}${reachedTarget ? " — target reached!" : ""}`);
      setTurn(current + 1);
      setPhase("ready");
    });
    if (!alive.current) return h.destroy(); // unmounted while Phaser was loading
    handle.current = h;
    setPhase("running");
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 touch-none select-none"
        style={{ aspectRatio: `${RUNNER_WIDTH} / ${RUNNER_HEIGHT}` }}
      >
        <div ref={mount} className="absolute inset-0" />
        {phase !== "running" && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 p-4 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              {lastRun && <p className="text-sm text-muted">{lastRun}</p>}
              <p className="text-4xl">{config.hero}</p>
              {players.length > 1 && (
                <p className="font-semibold" style={{ color: "var(--gp)" }}>
                  {players[turn]}, you&rsquo;re up
                </p>
              )}
              <Button onClick={run} disabled={phase === "loading"} autoFocus>
                {phase === "loading" ? <Loader2 className="animate-spin" /> : <Play />} Run
              </Button>
              <p className="text-xs text-muted">Tap / Space to jump · hold for higher</p>
            </div>
          </div>
        )}
      </div>
      <Scoreboard players={players} scores={scores} current={players.length > 1 ? turn : undefined} />
    </div>
  );
}
