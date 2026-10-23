import assert from "node:assert/strict";
import { test } from "node:test";

import { type Board, cpuMove, legalMoves, resolveMove, winningLine } from "../src/games/board-logic.ts";

const c4: Board = { rows: 6, cols: 7, need: 4, gravity: true };
const ttt: Board = { rows: 3, cols: 3, need: 3, gravity: false };
const empty = (b: Board) => Array(b.rows * b.cols).fill(null);

test("gravity drops to the lowest free cell and rejects full columns", () => {
  const g = empty(c4);
  assert.equal(resolveMove(g, c4, 3), 38); // click top of column 3 → bottom row
  for (let r = 0; r < 6; r++) g[r * 7 + 3] = 0;
  assert.equal(resolveMove(g, c4, 3), -1);
  assert.equal(legalMoves(g, c4).length, 6);
});

test("detects horizontal, vertical and diagonal wins", () => {
  const g = empty(ttt);
  [0, 4, 8].forEach((i) => (g[i] = 1));
  assert.deepEqual(winningLine(g, ttt, 4)?.sort(), [0, 4, 8]);
  const h = empty(c4);
  [35, 36, 37].forEach((i) => (h[i] = 0));
  assert.equal(winningLine(h, c4, 36), null);
  h[38] = 0;
  assert.equal(winningLine(h, c4, 38)?.length, 4);
});

test("CPU wins when it can, otherwise blocks", () => {
  const g = empty(ttt);
  g[0] = 1; g[1] = 1; g[3] = 0; g[4] = 0;
  assert.equal(cpuMove(g, ttt, 1, [0]), 2); // take the win over blocking 5
  const b = empty(ttt);
  b[3] = 0; b[4] = 0; b[0] = 1;
  assert.equal(cpuMove(b, ttt, 1, [0]), 5);
});
