"use client";

import { AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { QuizConfig } from "@/lib/types";
import { cn, shuffle } from "@/lib/utils";

import { type EngineProps, Scoreboard, TimerBar, TurnBanner, useCountdown } from "./shared";

export default function QuizGame({ config, players, onFinish }: EngineProps<QuizConfig>) {
  const questions = useMemo(
    () =>
      config.questions.map((q) => {
        const order = q.choices.map((_, i) => i);
        const shuffled = config.shuffle_choices ? shuffle(order) : order;
        return { ...q, choices: shuffled.map((i) => q.choices[i]), answer: shuffled.indexOf(q.answer_index) };
      }),
    [config],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // -1 = timed out
  const [scores, setScores] = useState(() => players.map(() => 0));
  const [correct, setCorrect] = useState(0);

  const perQuestion = config.timer_scope === "per_question";
  const q = questions[index];
  const player = index % players.length;
  const revealed = picked !== null;
  const last = index === questions.length - 1;

  const finish = useCallback(
    (finalScores: number[]) =>
      onFinish({
        scores: finalScores,
        detail: players.length === 1 ? `${correct} / ${questions.length} correct` : undefined,
      }),
    [onFinish, players.length, correct, questions.length],
  );

  const questionTimer = useCountdown(perQuestion ? config.timer_seconds : 0, !revealed, () => setPicked(-1), index);
  const totalTimer = useCountdown(perQuestion ? 0 : config.timer_seconds, true, () => finish(scores));

  const answer = (choice: number) => {
    if (revealed) return;
    setPicked(choice);
    if (choice === q.answer) {
      setCorrect((c) => c + 1);
      setScores((s) => s.map((v, i) => (i === player ? v + config.points_per_correct : v)));
    }
  };

  const next = () => {
    if (last) return finish(scores);
    setPicked(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          Q{index + 1}/{questions.length}
        </span>
        <TurnBanner name={players[player]} show={players.length > 1} />
      </div>
      <TimerBar
        remaining={perQuestion ? questionTimer : totalTimer}
        total={config.timer_seconds}
      />

      <AnimatePresence mode="wait">
        <m.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{q.prompt}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {q.choices.map((choice, i) => {
              const isAnswer = revealed && i === q.answer;
              const isWrongPick = revealed && i === picked && i !== q.answer;
              return (
                <button
                  key={choice}
                  onClick={() => answer(i)}
                  disabled={revealed}
                  className={cn(
                    "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all sm:text-base",
                    !revealed && "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-[var(--gp)] hover:bg-white/10",
                    isAnswer && "border-emerald-400 bg-emerald-400/15 text-white",
                    isWrongPick && "animate-shake border-danger bg-danger/15",
                    revealed && !isAnswer && !isWrongPick && "border-white/5 opacity-50",
                  )}
                >
                  <span>{choice}</span>
                  {isAnswer && <Check className="size-5 shrink-0 text-emerald-400" />}
                  {isWrongPick && <X className="size-5 shrink-0 text-danger" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                <span className={picked === q.answer ? "text-emerald-400" : "text-danger"}>
                  {picked === q.answer ? "Correct! " : picked === -1 ? "Time's up. " : "Not quite. "}
                </span>
                {q.explanation}
              </p>
              <Button onClick={next} className="self-end" autoFocus>
                {last ? "See results" : "Next question"}
              </Button>
            </m.div>
          )}
        </m.div>
      </AnimatePresence>

      <Scoreboard players={players} scores={scores} current={players.length > 1 ? player : undefined} />
    </div>
  );
}
