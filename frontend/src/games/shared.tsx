"use client";

import { useEffect, useRef, useState } from "react";

import { m } from "@/components/motion";
import type { GameConfig, Palette } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface GameResult {
  scores: number[];
  /** Optional one-line summary shown on the end screen (e.g. "Board full — draw"). */
  detail?: string;
  /** Explicit winners when score alone doesn't decide (e.g. board games). Defaults to top score(s). */
  winners?: number[];
}

export interface EngineProps<C extends GameConfig> {
  config: C;
  players: string[];
  onFinish: (result: GameResult) => void;
}

export const playerNames = (count: number) => Array.from({ length: count }, (_, i) => `Player ${i + 1}`);

export function paletteVars(p: Palette): React.CSSProperties {
  return { "--gp": p.primary, "--gs": p.secondary, "--ga": p.accent } as React.CSSProperties;
}

/**
 * Wall-clock countdown that survives re-renders. `resetKey` restarts it; `onExpire` fires once per cycle.
 * Returns remaining seconds (fractional). `seconds <= 0` disables the timer.
 */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void, resetKey: unknown = 0) {
  const [remaining, setRemaining] = useState(seconds);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  const left = useRef(seconds);

  useEffect(() => {
    left.current = seconds;
    setRemaining(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!running || seconds <= 0 || left.current <= 0) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      left.current = Math.max(0, left.current - (now - last) / 1000);
      last = now;
      setRemaining(left.current);
      if (left.current <= 0) {
        clearInterval(id);
        expire.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, seconds, resetKey]);

  return remaining;
}

export function TimerBar({ remaining, total }: { remaining: number; total: number }) {
  if (total <= 0) return null;
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const low = remaining <= Math.min(5, total * 0.25);
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`${Math.ceil(remaining)} seconds left`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%`, background: low ? "#fb7185" : "linear-gradient(90deg,var(--gp),var(--gs))" }}
        />
      </div>
      <span className={cn("w-10 text-right font-mono text-sm tabular-nums", low ? "text-danger" : "text-muted")}>
        {Math.ceil(remaining)}s
      </span>
    </div>
  );
}

export function Scoreboard({ players, scores, current }: { players: string[]; scores: number[]; current?: number }) {
  if (players.length === 1 && current === undefined) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Scores">
      {players.map((name, i) => (
        <div
          key={name}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all",
            i === current ? "border-[var(--gp)] bg-[var(--gp)]/15 text-white" : "border-white/10 text-muted",
          )}
          style={i === current ? { boxShadow: "0 0 18px -6px var(--gp)" } : undefined}
        >
          <span className="font-medium">{name}</span>
          <span className="font-mono tabular-nums">{scores[i] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

export function TurnBanner({ name, show }: { name: string; show: boolean }) {
  if (!show) return null;
  return (
    <m.p
      key={name}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm font-semibold"
      style={{ color: "var(--gp)" }}
    >
      {name}&rsquo;s turn
    </m.p>
  );
}

export function winnersOf(result: GameResult): number[] {
  if (result.winners) return result.winners;
  const best = Math.max(...result.scores);
  return result.scores.flatMap((s, i) => (s === best ? [i] : []));
}
