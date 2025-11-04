// src/services/gameLogic.ts
export type Cell = "." | "X" | "O";
export const SIZE = 16;
export const WIN = 5;

export function emptyBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => "." as Cell)
  );
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

const DIRS: Array<[number, number]> = [
  [0, 1],   // ngang
  [1, 0],   // dọc
  [1, 1],   // chéo xuôi
  [1, -1],  // chéo ngược
];

export function checkWin(board: Cell[][], r: number, c: number, me: Cell): boolean {
  for (const [dr, dc] of DIRS) {
    let cnt = 1;
    // tiến
    let rr = r + dr, cc = c + dc;
    while (inBounds(rr, cc) && board[rr][cc] === me) { cnt++; rr += dr; cc += dc; }
    // lùi
    rr = r - dr; cc = c - dc;
    while (inBounds(rr, cc) && board[rr][cc] === me) { cnt++; rr -= dr; cc -= dc; }
    if (cnt >= WIN) return true;
  }
  return false;
}
