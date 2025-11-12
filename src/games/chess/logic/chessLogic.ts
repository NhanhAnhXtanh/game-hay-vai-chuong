import { Chess, type PieceSymbol, type Square } from "chess.js";

export type ChessSide = "white" | "black";

export const INITIAL_FEN = new Chess().fen();
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const UNICODE_MAP: Record<"w" | "b", Record<PieceSymbol, string>> = {
  w: {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙"
  },
  b: {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟︎"
  }
};

export function createChess(fen?: string) {
  return fen ? new Chess(fen) : new Chess();
}

export function chessTurnToSide(chess: Chess): ChessSide {
  return chess.turn() === "w" ? "white" : "black";
}

export function squareToIndex(square: Square) {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);
  return ((8 - rank) << 4) | file;
}

export function indexToSquare(index: number): Square {
  const file = FILES[index & 15];
  const rank = 8 - (index >> 4);
  return `${file}${rank}` as Square;
}

export interface LooseMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol | null;
}

export interface BoardPiece {
  color: "w" | "b";
  type: PieceSymbol;
  unicode: string;
}

export type BoardMatrix = (BoardPiece | null)[][];

export interface HistoryMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol | null;
  captured?: PieceSymbol | null;
}

const START_BOARD = (() => {
  const chess = new Chess();
  const board = chess.board();
  const map: Partial<Record<Square, BoardPiece>> = {};
  board.forEach((row, rowIdx) => {
    row.forEach((square, colIdx) => {
      if (square) {
        const rank = 8 - rowIdx;
        const file = FILES[colIdx];
        map[`${file}${rank}` as Square] = {
          color: square.color,
          type: square.type,
          unicode: UNICODE_MAP[square.color][square.type]
        };
      }
    });
  });
  return map;
})();

export function boardFromMoves(moves: HistoryMove[]): BoardMatrix {
  const map: Partial<Record<Square, BoardPiece>> = {};
  for (const key in START_BOARD) {
    map[key as Square] = START_BOARD[key as Square];
  }
  for (const move of moves) {
    const piece = map[move.from];
    if (!piece) continue;
    const color = piece.color;
    const type = move.promotion ?? piece.type;
    delete map[move.from];
    map[move.to] = {
      color,
      type,
      unicode: UNICODE_MAP[color][type]
    };
  }
  const matrix: BoardMatrix = [];
  for (let row = 0; row < 8; row++) {
    const rank = 8 - row;
    matrix[row] = [];
    for (let col = 0; col < 8; col++) {
      const file = FILES[col];
      matrix[row][col] = map[`${file}${rank}` as Square] ?? null;
    }
  }
  return matrix;
}

export function looseMovesFrom(fen: string, from?: Square): LooseMove[] {
  const engine = createChess(fen) as unknown as { _moves?: (args: Record<string, unknown>) => any[] };
  const internalMoves =
    typeof engine._moves === "function"
      ? engine._moves({ legal: false, square: from })
      : [];

  return internalMoves.map((move: any) => ({
    from: indexToSquare(move.from),
    to: indexToSquare(move.to),
    promotion: move.promotion ?? null
  }));
}
