import { describe, expect, it } from "vitest";
import {
  emptyBoard,
  findWinningLine,
  checkWin,
  SIZE,
  WIN,
  type Cell
} from "./gameLogic";

function placeRun(
  board: Cell[][],
  start: { r: number; c: number },
  dir: { dr: number; dc: number },
  count: number,
  player: Cell
) {
  for (let i = 0; i < count; i++) {
    board[start.r + dir.dr * i][start.c + dir.dc * i] = player;
  }
}

describe("emptyBoard", () => {
  it("returns SIZE x SIZE grid filled with '.'", () => {
    const b = emptyBoard();
    expect(b.length).toBe(SIZE);
    expect(b[0].length).toBe(SIZE);
    expect(b.every(row => row.every(cell => cell === "."))).toBe(true);
  });

  it("returns a fresh independent grid each call", () => {
    const a = emptyBoard();
    const b = emptyBoard();
    a[0][0] = "X";
    expect(b[0][0]).toBe(".");
  });
});

describe("findWinningLine - basic detection", () => {
  it("returns null when the placed cell does not match the player", () => {
    const b = emptyBoard();
    expect(findWinningLine(b, 0, 0, "X")).toBeNull();
  });

  it("returns null when no winning line exists", () => {
    const b = emptyBoard();
    b[5][5] = "X";
    b[5][6] = "X";
    expect(findWinningLine(b, 5, 5, "X")).toBeNull();
  });

  it("detects a horizontal 5-in-a-row from the leftmost cell", () => {
    const b = emptyBoard();
    placeRun(b, { r: 3, c: 2 }, { dr: 0, dc: 1 }, WIN, "X");
    const line = findWinningLine(b, 3, 2, "X");
    expect(line).not.toBeNull();
    expect(line!.length).toBe(WIN);
    expect(line![0]).toEqual({ r: 3, c: 2 });
    expect(line![WIN - 1]).toEqual({ r: 3, c: 6 });
  });

  it("detects a horizontal 5-in-a-row queried from a middle cell", () => {
    const b = emptyBoard();
    placeRun(b, { r: 3, c: 2 }, { dr: 0, dc: 1 }, WIN, "X");
    const line = findWinningLine(b, 3, 4, "X");
    expect(line).not.toBeNull();
    expect(line!.length).toBe(WIN);
  });

  it("detects a vertical 5-in-a-row", () => {
    const b = emptyBoard();
    placeRun(b, { r: 2, c: 7 }, { dr: 1, dc: 0 }, WIN, "O");
    const line = findWinningLine(b, 4, 7, "O");
    expect(line).not.toBeNull();
    expect(line!.length).toBe(WIN);
  });

  it("detects a diagonal (down-right) 5-in-a-row", () => {
    const b = emptyBoard();
    placeRun(b, { r: 1, c: 1 }, { dr: 1, dc: 1 }, WIN, "X");
    const line = findWinningLine(b, 3, 3, "X");
    expect(line).not.toBeNull();
    expect(line!.length).toBe(WIN);
  });

  it("detects an anti-diagonal (down-left) 5-in-a-row", () => {
    const b = emptyBoard();
    placeRun(b, { r: 1, c: 10 }, { dr: 1, dc: -1 }, WIN, "O");
    const line = findWinningLine(b, 3, 8, "O");
    expect(line).not.toBeNull();
    expect(line!.length).toBe(WIN);
  });
});

describe("findWinningLine - long runs and edges", () => {
  it("returns >= WIN cells when 6 in a row are present", () => {
    const b = emptyBoard();
    placeRun(b, { r: 0, c: 0 }, { dr: 0, dc: 1 }, 6, "X");
    const line = findWinningLine(b, 0, 3, "X");
    expect(line).not.toBeNull();
    expect(line!.length).toBeGreaterThanOrEqual(WIN);
  });

  it("does not crash at the bottom-right corner of the board", () => {
    const b = emptyBoard();
    placeRun(b, { r: SIZE - WIN, c: SIZE - WIN }, { dr: 1, dc: 1 }, WIN, "X");
    const line = findWinningLine(b, SIZE - 1, SIZE - 1, "X");
    expect(line).not.toBeNull();
  });

  it("does not falsely detect a win across mixed players", () => {
    const b = emptyBoard();
    b[0][0] = "X";
    b[0][1] = "X";
    b[0][2] = "O";
    b[0][3] = "X";
    b[0][4] = "X";
    expect(findWinningLine(b, 0, 0, "X")).toBeNull();
    expect(findWinningLine(b, 0, 4, "X")).toBeNull();
  });

  it("returns null when fewer than WIN consecutive cells exist", () => {
    const b = emptyBoard();
    placeRun(b, { r: 5, c: 5 }, { dr: 0, dc: 1 }, WIN - 1, "X");
    const line = findWinningLine(b, 5, 5, "X");
    expect(line).toBeNull();
  });

  it("handles out-of-bounds coordinates gracefully", () => {
    const b = emptyBoard();
    expect(findWinningLine(b, -1, 0, "X")).toBeNull();
    expect(findWinningLine(b, SIZE, 0, "X")).toBeNull();
    expect(findWinningLine(b, 0, SIZE, "X")).toBeNull();
  });
});

describe("checkWin", () => {
  it("returns true when there is a winning line", () => {
    const b = emptyBoard();
    placeRun(b, { r: 9, c: 9 }, { dr: 0, dc: 1 }, WIN, "O");
    expect(checkWin(b, 9, 11, "O")).toBe(true);
  });

  it("returns false when there is no winning line", () => {
    const b = emptyBoard();
    b[0][0] = "X";
    expect(checkWin(b, 0, 0, "X")).toBe(false);
  });
});
