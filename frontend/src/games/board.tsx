"use client";

import { useEffect, useMemo, useState } from "react";

import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { BoardConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

import { type Board, cpuMove, type Grid, legalMoves, resolveMove, winningLine } from "./board-logic";
import { type EngineProps, Scoreboard } from "./shared";

const ROUNDS_TO_WIN = 2; // first side to two round wins takes the match…
const MAX_ROUNDS = 5; // …or the leader after five rounds (draws happen)

export default function BoardGame({ config, players, onFinish }: EngineProps<BoardConfig>) {
  const board: Board = useMemo(
    () => ({ rows: config.rows, cols: config.columns, need: config.win_length, gravity: config.gravity }),
    [config],
  );
  const vsCpu = players.length === 1;
  const sides = vsCpu ? 2 : players.length;
  const names = vsCpu ? [players[0], "CPU"] : players;
  const pieces = config.pieces.slice(0, sides);

  const [grid, setGrid] = useState<Grid>(() => Array(board.rows * board.cols).fill(null));
  const [round, setRound] = useState(0);
  const [turn, setTurn] = useState(0);
  const [wins, setWins] = useState(() => Array(sides).fill(0) as number[]);
  const [line, setLine] = useState<number[] | null>(null);
  const [roundOver, setRoundOver] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const cpuTurn = vsCpu && turn === 1 && !roundOver;

  const play = (idx: number) => {
    if (roundOver) return;
    const cell = resolveMove(grid, board, idx);
    if (cell < 0) return;
    const next = [...grid];
    next[cell] = turn;
    setGrid(next);

    const won = winningLine(next, board, cell);
    if (won) {
      setLine(won);
      setWins((w) => w.map((v, i) => (i === turn ? v + 1 : v)));
      setRoundOver(`${names[turn]} wins the round!`);
    } else if (legalMoves(next, board).length === 0) {
      setRoundOver("Board full — draw.");
    } else {
      setTurn((t) => (t + 1) % sides);
    }
  };

  useEffect(() => {
    if (!cpuTurn) return;
    const t = setTimeout(() => play(cpuMove(grid, board, 1, [0])), 450);
    return () => clearTimeout(t);
  }, [cpuTurn, grid]); // eslint-disable-line react-hooks/exhaustive-deps

  const leader = Math.max(...wins);
  const matchOver = wins.some((w) => w >= ROUNDS_TO_WIN) || round + 1 >= MAX_ROUNDS;

  const nextRound = () => {
    if (matchOver) {
      const winners = wins.flatMap((w, i) => (w === leader ? [i] : []));
      const detail = winners.length > 1 ? "The match ends level" : `${names[winners[0]]} takes the match`;
      onFinish({ scores: wins, winners, detail });
      return;
    }
    setGrid(Array(board.rows * board.cols).fill(null));
    setLine(null);
    setRoundOver(null);
    setRound((r) => r + 1);
    setTurn((round + 1) % sides); // alternate who opens
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          Round {round + 1} · {config.win_length} in a row{config.gravity ? " · pieces drop" : ""}
        </span>
        <p className="text-sm font-semibold" style={{ color: "var(--gp)" }} aria-live="polite">
          {roundOver ?? (cpuTurn ? "CPU is thinking…" : `${pieces[turn].symbol} ${names[turn]}'s turn`)}
        </p>
      </div>

      <div
        className="mx-auto grid w-full gap-1 rounded-2xl border border-white/10 bg-black/30 p-2 sm:gap-1.5 sm:p-3"
        style={{
          gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
          maxWidth: `min(100%, ${board.cols * 64}px, calc((100dvh - 260px) * ${board.cols / board.rows}))`,
        }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {grid.map((cell, i) => {
          const col = i % board.cols;
          const highlight = board.gravity && hoverCol === col && !roundOver && !cpuTurn;
          return (
            <button
              key={i}
              onClick={() => !cpuTurn && play(i)}
              onMouseEnter={() => setHoverCol(col)}
              disabled={cpuTurn || !!roundOver || (!board.gravity && cell !== null)}
              aria-label={cell === null ? `Row ${Math.floor(i / board.cols) + 1}, column ${col + 1}` : pieces[cell].name}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border text-[clamp(1rem,5vw,1.9rem)] transition-colors",
                "border-white/5 bg-white/[0.04]",
                highlight && "bg-white/[0.09]",
                !board.gravity && cell === null && !roundOver && "hover:border-[var(--gp)] hover:bg-white/10",
                line?.includes(i) && "border-[var(--ga)] bg-[var(--ga)]/20",
              )}
              style={line?.includes(i) ? { boxShadow: "0 0 18px -4px var(--ga)" } : undefined}
            >
              {cell !== null && (
                <m.span
                  initial={board.gravity ? { y: -40, opacity: 0 } : { scale: 0.3, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                >
                  {pieces[cell].symbol}
                </m.span>
              )}
            </button>
          );
        })}
      </div>

      {roundOver && (
        <Button onClick={nextRound} className="self-center" autoFocus>
          {matchOver ? "See results" : "Next round"}
        </Button>
      )}

      <Scoreboard
        players={names.map((n, i) => `${pieces[i].symbol} ${n}`)}
        scores={wins}
        current={roundOver ? undefined : turn}
      />
    </div>
  );
}
