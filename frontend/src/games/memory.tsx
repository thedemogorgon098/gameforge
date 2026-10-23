"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { m } from "@/components/motion";
import type { MemoryConfig } from "@/lib/types";
import { cn, shuffle } from "@/lib/utils";

import { type EngineProps, Scoreboard, TimerBar, TurnBanner, useCountdown } from "./shared";

export default function MemoryGame({ config, players, onFinish }: EngineProps<MemoryConfig>) {
  const deck = useMemo(
    () => shuffle(config.cards.flatMap((card, pair) => [0, 1].map((n) => ({ ...card, pair, key: `${pair}-${n}` })))),
    [config],
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  const [scores, setScores] = useState(() => players.map(() => 0));
  const [player, setPlayer] = useState(0);
  const [moves, setMoves] = useState(0);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const done = matched.size === config.cards.length;

  const remaining = useCountdown(config.time_limit_seconds, !done, () =>
    onFinish({ scores, detail: `Time's up — ${matched.size}/${config.cards.length} pairs found` }),
  );

  useEffect(() => () => clearTimeout(timeout.current), []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(
      () => onFinish({ scores, detail: players.length === 1 ? `Cleared in ${moves} moves` : undefined }),
      700,
    );
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(deck[i].pair)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves((n) => n + 1);
    const [a, b] = next.map((j) => deck[j]);
    if (a.pair === b.pair) {
      setMatched((s) => new Set(s).add(a.pair));
      setScores((s) => s.map((v, k) => (k === player ? v + 1 : v)));
      setFlipped([]); // matched cards stay face up; same player goes again
    } else {
      timeout.current = setTimeout(() => {
        setFlipped([]);
        setPlayer((p) => (p + 1) % players.length);
      }, config.reveal_ms);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          {matched.size}/{config.cards.length} pairs · {moves} moves
        </span>
        <TurnBanner name={players[player]} show={players.length > 1} />
      </div>
      <TimerBar remaining={remaining} total={config.time_limit_seconds} />

      <div
        className="mx-auto grid w-full max-w-xl gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }}
      >
        {deck.map((card, i) => {
          const isMatched = matched.has(card.pair);
          const faceUp = isMatched || flipped.includes(i);
          return (
            <button
              key={card.key}
              onClick={() => flip(i)}
              aria-label={faceUp ? card.label : `Hidden card ${i + 1}`}
              className="aspect-square [perspective:800px]"
            >
              <m.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0, scale: isMatched ? 0.94 : 1 }}
                transition={{ duration: 0.35 }}
              >
                <div className="absolute inset-0 grid place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-[var(--gp)]/25 to-[var(--gs)]/25 text-lg text-white/40 [backface-visibility:hidden] hover:border-[var(--gp)]">
                  ?
                </div>
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl border bg-black/40 p-1 [backface-visibility:hidden] [transform:rotateY(180deg)]",
                    isMatched ? "border-[var(--ga)]" : "border-[var(--gp)]",
                  )}
                  style={isMatched ? { boxShadow: "0 0 20px -6px var(--ga)" } : undefined}
                >
                  <span className="text-[clamp(1.25rem,6vw,2.25rem)] leading-none">{card.symbol}</span>
                  <span className="hidden max-w-full truncate px-1 text-[10px] text-muted sm:block">{card.label}</span>
                </div>
              </m.div>
            </button>
          );
        })}
      </div>

      <Scoreboard players={players} scores={scores} current={players.length > 1 ? player : undefined} />
    </div>
  );
}
