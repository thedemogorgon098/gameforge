// Pure connect-N rules + a small heuristic CPU. Cells are indexed row-major; null = empty, n = side index.

export type Grid = (number | null)[];

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

export interface Board {
  rows: number;
  cols: number;
  need: number;
  gravity: boolean;
}

/** The cell a click on `idx` actually fills (gravity drops to the lowest free row), or -1 if illegal. */
export function resolveMove(grid: Grid, b: Board, idx: number): number {
  if (!b.gravity) return grid[idx] === null ? idx : -1;
  const col = idx % b.cols;
  for (let r = b.rows - 1; r >= 0; r--) {
    const i = r * b.cols + col;
    if (grid[i] === null) return i;
  }
  return -1;
}

export function legalMoves(grid: Grid, b: Board): number[] {
  if (!b.gravity) return grid.flatMap((c, i) => (c === null ? [i] : []));
  return Array.from({ length: b.cols }, (_, c) => resolveMove(grid, b, c)).filter((i) => i >= 0);
}

function lineThrough(grid: Grid, b: Board, idx: number, side: number, dr: number, dc: number): number[] {
  const r0 = Math.floor(idx / b.cols);
  const c0 = idx % b.cols;
  const cells = [idx];
  for (const sign of [1, -1]) {
    let r = r0 + dr * sign;
    let c = c0 + dc * sign;
    while (r >= 0 && r < b.rows && c >= 0 && c < b.cols && grid[r * b.cols + c] === side) {
      cells.push(r * b.cols + c);
      r += dr * sign;
      c += dc * sign;
    }
  }
  return cells;
}

/** Longest same-side run through `idx` if `side` occupied it. */
export function longestRun(grid: Grid, b: Board, idx: number, side: number): number {
  return Math.max(...DIRECTIONS.map(([dr, dc]) => lineThrough(grid, b, idx, side, dr, dc).length));
}

/** Winning cells created by the piece at `idx`, or null. */
export function winningLine(grid: Grid, b: Board, idx: number): number[] | null {
  const side = grid[idx];
  if (side === null) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const line = lineThrough(grid, b, idx, side, dr, dc);
    if (line.length >= b.need) return line;
  }
  return null;
}

/** Win now > block an immediate loss > build long lines near the centre, avoiding gifting a win above. */
export function cpuMove(grid: Grid, b: Board, me: number, opponents: number[]): number {
  const moves = legalMoves(grid, b);
  for (const m of moves) if (longestRun(grid, b, m, me) >= b.need) return m;
  for (const opp of opponents) for (const m of moves) if (longestRun(grid, b, m, opp) >= b.need) return m;

  const cr = (b.rows - 1) / 2;
  const cc = (b.cols - 1) / 2;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const r = Math.floor(m / b.cols);
    const c = m % b.cols;
    let score = longestRun(grid, b, m, me) * 3;
    score += Math.max(...opponents.map((o) => longestRun(grid, b, m, o))) * 2;
    score -= (Math.abs(r - cr) + Math.abs(c - cc)) * 0.3;
    if (b.gravity && r > 0) {
      const above = m - b.cols;
      const next = [...grid];
      next[m] = me;
      if (opponents.some((o) => longestRun(next, b, above, o) >= b.need)) score -= 100;
    }
    score += Math.random() * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
