"use client";

import { AnimatePresence } from "framer-motion";
import { Delete, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { WordConfig } from "@/lib/types";
import { cn, shuffle } from "@/lib/utils";

import { type EngineProps, Scoreboard, TimerBar, TurnBanner, useCountdown } from "./shared";

function scramble(word: string): string[] {
  const letters = word.split("");
  for (let tries = 0; tries < 8; tries++) {
    const s = shuffle(letters);
    if (s.join("") !== word) return s;
  }
  return letters.reverse();
}

type Outcome = "solved" | "failed" | null;

export default function WordGame({ config, players, onFinish }: EngineProps<WordConfig>) {
  const [index, setIndex] = useState(0);
  const entry = config.words[index];
  const tiles = useMemo(() => scramble(entry.word), [entry.word]);
  const locked = config.reveal_first_letter ? tiles.indexOf(entry.word[0]) : -1;
  const [picked, setPicked] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [scores, setScores] = useState(() => players.map(() => 0));
  const [solved, setSolved] = useState(0);

  const player = index % players.length;
  const sequence = locked >= 0 ? [locked, ...picked] : picked;
  const guess = sequence.map((i) => tiles[i]).join("");

  const remaining = useCountdown(config.time_per_word_seconds, outcome === null, () => setOutcome("failed"), index);

  const advance = useCallback(() => {
    if (index === config.words.length - 1) {
      onFinish({ scores, detail: players.length === 1 ? `${solved} / ${config.words.length} words solved` : undefined });
      return;
    }
    setIndex((i) => i + 1);
    setPicked([]);
    setMistakes(0);
    setShake(0);
    setOutcome(null);
  }, [index, config.words.length, onFinish, scores, players.length, solved]);

  // Check a full-length guess.
  useEffect(() => {
    if (outcome || guess.length !== entry.word.length) return;
    if (guess === entry.word) {
      const bonus = config.time_per_word_seconds > 0 ? Math.ceil(remaining) * 2 : 0;
      setScores((s) => s.map((v, i) => (i === player ? v + entry.word.length * 10 + bonus : v)));
      setSolved((n) => n + 1);
      setOutcome("solved");
      return;
    }
    const used = mistakes + 1;
    setMistakes(used);
    setShake((n) => n + 1);
    if (config.max_mistakes > 0 && used >= config.max_mistakes) setOutcome("failed");
    else setTimeout(() => setPicked([]), 350);
  }, [guess]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = useCallback(
    (i: number) => {
      if (outcome || i === locked || picked.includes(i) || sequence.length >= entry.word.length) return;
      setPicked((p) => [...p, i]);
    },
    [outcome, locked, picked, sequence.length, entry.word.length],
  );
  const undo = useCallback(() => !outcome && setPicked((p) => p.slice(0, -1)), [outcome]);

  // Physical keyboard: letters pick the first free matching tile, Backspace undoes (Enter hits the focused Next button).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace") return undo();
      const letter = e.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) {
        const i = tiles.findIndex((t, k) => t === letter && k !== locked && !picked.includes(k));
        if (i >= 0) pick(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tiles, locked, picked, pick, undo]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          Word {index + 1}/{config.words.length}
          {config.max_mistakes > 0 && ` · ${config.max_mistakes - mistakes} tries left`}
        </span>
        <TurnBanner name={players[player]} show={players.length > 1} />
      </div>
      <TimerBar remaining={remaining} total={config.time_per_word_seconds} />

      <AnimatePresence mode="wait">
        <m.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="flex flex-col items-center gap-6"
        >
          <p className="text-center text-lg text-muted sm:text-xl">
            <span className="mr-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ga)" }}>
              Hint
            </span>
            {entry.hint}
          </p>

          {/* Answer slots */}
          <div key={shake} className={cn("flex flex-wrap justify-center gap-1.5 sm:gap-2", shake > 0 && "animate-shake")}>
            {entry.word.split("").map((letter, i) => {
              const shown = outcome === "failed" ? letter : guess[i];
              return (
                <span
                  key={i}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border-2 font-mono text-xl font-bold sm:size-12 sm:text-2xl",
                    shown ? "border-[var(--gp)] text-white" : "border-white/15 text-transparent",
                    outcome === "solved" && "border-emerald-400 bg-emerald-400/15",
                    outcome === "failed" && "border-danger/70 text-danger",
                  )}
                >
                  {shown ?? "_"}
                </span>
              );
            })}
          </div>

          {/* Letter tiles */}
          <div className="flex max-w-md flex-wrap justify-center gap-2">
            {tiles.map((letter, i) => {
              const used = i === locked || picked.includes(i);
              return (
                <m.button
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pick(i)}
                  disabled={used || outcome !== null}
                  className={cn(
                    "grid size-12 place-items-center rounded-xl border font-mono text-xl font-bold transition-all sm:size-14",
                    used
                      ? "border-white/5 bg-white/[0.02] text-white/15"
                      : "border-white/15 bg-white/10 hover:-translate-y-0.5 hover:border-[var(--gp)]",
                  )}
                >
                  {letter}
                </m.button>
              );
            })}
          </div>

          <div className="flex gap-3">
            {outcome ? (
              <Button onClick={advance} autoFocus>
                {outcome === "solved" ? "Nice! " : `It was ${entry.word}. `}
                {index === config.words.length - 1 ? "Finish" : "Next word"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={undo} disabled={picked.length === 0}>
                  <Delete /> Undo
                </Button>
                <Button variant="ghost" onClick={() => setOutcome("failed")}>
                  <SkipForward /> Skip
                </Button>
              </>
            )}
          </div>
        </m.div>
      </AnimatePresence>

      <Scoreboard players={players} scores={scores} current={players.length > 1 ? player : undefined} />
    </div>
  );
}
