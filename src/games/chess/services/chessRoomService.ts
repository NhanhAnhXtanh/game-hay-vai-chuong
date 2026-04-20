import {
  ref,
  set,
  serverTimestamp,
  onValue,
  type Unsubscribe,
  runTransaction,
  update
} from "firebase/database";
import type { PieceSymbol, Square } from "chess.js";
import { nanoid } from "nanoid";
import { chessDb } from "../../shared/firebase";
import {
  INITIAL_FEN,
  chessTurnToSide,
  createChess,
  squareToIndex,
  type ChessSide
} from "../logic/chessLogic";

const COLLECTION = "matches";

export type ChessRoomStatus = "LOBBY" | "PLAYING" | "CHECKMATE" | "DRAW" | "STALEMATE" | "RESIGN";

export interface ChessPlayer {
  uid: string;
  name: string;
}

export interface ChessMove {
  moveNumber: number;
  san: string;
  from: Square;
  to: Square;
  promotion: PieceSymbol | null;
  captured: PieceSymbol | null;
  by: ChessSide;
  createdAt: number | object;
}

export interface ChessRoom {
  id: string;
  name: string;
  status: ChessRoomStatus;
  fen: string;
  turn: ChessSide;
  winner: ChessSide | null;
  result?: {
    type: ChessRoomStatus;
    by?: ChessSide;
  } | null;
  finishedAt: number | object | null;
  finishAck: { white: boolean; black: boolean };
  players: {
    white: ChessPlayer | null;
    black: ChessPlayer | null;
  };
  scores?: Record<string, number>;
  moves: ChessMove[];
  createdAt: number | object;
  updatedAt: number | object;
}

function roomRef(roomId: string) {
  return ref(chessDb, `${COLLECTION}/${roomId}`);
}

function ensureScores(room: ChessRoom) {
  if (!room.scores) {
    room.scores = {};
  }
  return room.scores;
}

function incrementScore(room: ChessRoom, side: ChessSide | null) {
  if (!side) return;
  if (!room.players) room.players = { white: null, black: null };
  const player = room.players[side];
  if (!player?.uid) return;
  const scores = ensureScores(room);
  const current = typeof scores[player.uid] === "number" ? scores[player.uid]! : 0;
  scores[player.uid] = current + 1;
}

export async function createChessRoom(name: string) {
  const id = nanoid(5).toUpperCase();
  const payload: ChessRoom = {
    id,
    name: name.trim() || "Chess room",
    status: "LOBBY",
    fen: INITIAL_FEN,
    turn: "white",
    winner: null,
    result: null,
    finishedAt: null,
    finishAck: { white: false, black: false },
    players: { white: null, black: null },
    scores: {},
    moves: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await set(roomRef(id), payload);
  return id;
}

export function listenChessRoom(roomId: string, cb: (room: ChessRoom | null) => void): Unsubscribe {
  return onValue(roomRef(roomId), snapshot => {
    cb(snapshot.val());
  });
}

export async function joinChessRoom(roomId: string, uid: string, name: string) {
  const normalized = name.trim() || "Guest";
  let assigned: ChessSide | null = null;
  let error: string | null = null;

  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) {
      error = "Room not found";
      return room;
    }
    if (!room.finishAck) room.finishAck = { white: false, black: false };
    if (typeof room.finishedAt === "undefined") room.finishedAt = null;
    if (!room.players) room.players = { white: null, black: null };
    if (!room.scores) room.scores = {};

    const rejoin =
      room.players.white?.uid === uid ? "white" :
      room.players.black?.uid === uid ? "black" :
      null;

    if (rejoin) {
      room.players[rejoin]!.name = normalized;
      assigned = rejoin;
      room.updatedAt = serverTimestamp();
      return room;
    }

    const slot = !room.players.white ? "white" : (!room.players.black ? "black" : null);
    if (!slot) {
      error = "Room da du 2 nguoi";
      return room;
    }

    room.players[slot] = { uid, name: normalized };
    assigned = slot;
    if (typeof room.scores[uid] !== "number") {
      room.scores[uid] = 0;
    }

    if (room.status === "LOBBY" && room.players.white && room.players.black) {
      room.status = "PLAYING";
      room.fen = INITIAL_FEN;
      room.turn = "white";
      room.moves = [];
      room.winner = null;
      room.result = null;
      room.finishedAt = null;
      room.finishAck = { white: false, black: false };
    }

    room.updatedAt = serverTimestamp();
    return room;
  });

  if (error) throw new Error(error);
  if (!assigned) throw new Error("Khong the vao phong.");
  return assigned;
}

export async function leaveChessRoom(roomId: string, uid: string) {
  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) return room;
    if (!room.finishAck) room.finishAck = { white: false, black: false };
    if (typeof room.finishedAt === "undefined") room.finishedAt = null;
    if (!room.players) room.players = { white: null, black: null };
    if (!room.scores) room.scores = {};
    const side =
      room.players.white?.uid === uid ? "white" :
      room.players.black?.uid === uid ? "black" :
      null;
    if (!side) return room;
    room.players[side] = null;
    room.scores = {};
    room.status = "LOBBY";
    room.fen = INITIAL_FEN;
    room.turn = "white";
    room.moves = [];
    room.winner = null;
    room.result = null;
    room.finishedAt = null;
    room.finishAck = { white: false, black: false };
    room.updatedAt = serverTimestamp();
    return room;
  });
}

export interface MovePayload {
  from: Square;
  to: Square;
  promotion?: PieceSymbol | null;
  uid: string;
}

export async function makeChessMove(roomId: string, payload: MovePayload) {
  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) return room;
    if (!room.finishAck) room.finishAck = { white: false, black: false };
    if (typeof room.finishedAt === "undefined") room.finishedAt = null;
    if (!room.scores) room.scores = {};
    if (room.status === "CHECKMATE") return room;
    const side =
      room.players.white?.uid === payload.uid ? "white" :
      room.players.black?.uid === payload.uid ? "black" :
      null;
    if (!side) return room;

    const chess = createChess(room.fen);
    const turn = chessTurnToSide(chess);
    if (room.status === "PLAYING" && turn !== side) return room;

    const internalMove = findLooseInternalMove(chess, payload);
    if (!internalMove) return room;

    const capturedPiece = internalMove.captured ?? null;
    const promotion = internalMove.promotion ?? null;

    const san = buildSan(chess, internalMove) ?? `${payload.from}-${payload.to}`;

    (chess as unknown as { _makeMove: (move: unknown) => void })._makeMove(internalMove);

    const moveNumber = room.moves?.length ? Math.ceil((room.moves.length + 1) / 2) : 1;
    const newMove: ChessMove = {
      moveNumber,
      san,
      from: payload.from,
      to: payload.to,
      promotion,
      captured: capturedPiece,
      by: side,
      createdAt: serverTimestamp()
    };

    const computedFen = chess.fen();
    room.turn = chessTurnToSide(chess);
    room.moves = [...(room.moves ?? []), newMove];
    room.updatedAt = serverTimestamp();

    if (capturedPiece === "k") {
      room.status = "CHECKMATE";
      room.winner = side;
      room.result = { type: "CHECKMATE", by: side };
      room.finishedAt = serverTimestamp();
      room.finishAck = { white: false, black: false };
      incrementScore(room, side);
    } else {
      room.fen = computedFen;
      const endState = detectEndState(chess);
      if (endState === "CHECKMATE") {
        room.status = "CHECKMATE";
        room.winner = side;
        room.result = { type: "CHECKMATE", by: side };
        room.finishedAt = serverTimestamp();
        room.finishAck = { white: false, black: false };
        incrementScore(room, side);
      } else if (endState === "STALEMATE" || endState === "DRAW") {
        room.status = endState;
        room.winner = null;
        room.result = { type: endState };
        room.finishedAt = serverTimestamp();
        room.finishAck = { white: false, black: false };
      } else {
        room.status = "PLAYING";
        room.result = null;
        room.winner = null;
        room.finishedAt = null;
        room.finishAck = { white: false, black: false };
      }
    }

    return room;
  });
}

function findLooseInternalMove(chess: ReturnType<typeof createChess>, payload: MovePayload) {
  const engine = chess as unknown as { _moves?: (params: Record<string, unknown>) => any[] };
  if (typeof engine._moves !== "function") return null;
  const possible = engine._moves({ legal: false, square: payload.from });
  const fromIndex = squareToIndex(payload.from);
  const toIndex = squareToIndex(payload.to);
  const wantedPromotion = payload.promotion ?? null;
  const matches = possible.filter((move: any) => move.from === fromIndex && move.to === toIndex);
  if (!matches.length) return null;
  if (wantedPromotion) {
    const exact = matches.find((move: any) => move.promotion === wantedPromotion);
    if (exact) return exact;
  }
  return matches[0];
}

function detectEndState(chess: ReturnType<typeof createChess>): ChessRoomStatus | null {
  try {
    if (chess.isCheckmate()) return "CHECKMATE";
    if (chess.isStalemate()) return "STALEMATE";
    if (chess.isInsufficientMaterial()) return "DRAW";
    if (chess.isThreefoldRepetition()) return "DRAW";
    if (chess.isDraw()) return "DRAW";
  } catch {
    /* ignore */
  }
  return null;
}

function buildSan(chess: ReturnType<typeof createChess>, internalMove: any): string | null {
  const engine = chess as unknown as {
    _moveToSan?: (move: any, moves: any[]) => string;
    _moves?: (params: Record<string, unknown>) => any[];
  };
  if (typeof engine._moveToSan !== "function" || typeof engine._moves !== "function") {
    return null;
  }
  try {
    const legalMoves = engine._moves({ legal: true });
    return engine._moveToSan(internalMove, legalMoves);
  } catch {
    return null;
  }
}

export async function resignChess(roomId: string, uid: string) {
  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) return room;
    if (room.status !== "PLAYING") return room;
    if (!room.finishAck) room.finishAck = { white: false, black: false };
    if (typeof room.finishedAt === "undefined") room.finishedAt = null;
    if (!room.players) room.players = { white: null, black: null };
    if (!room.scores) room.scores = {};
    const side =
      room.players.white?.uid === uid ? "white" :
      room.players.black?.uid === uid ? "black" :
      null;
    if (!side) return room;
    const winner = side === "white" ? "black" : "white";
    room.status = "RESIGN";
    room.winner = winner;
    room.result = { type: "RESIGN", by: winner };
    room.finishedAt = serverTimestamp();
    room.finishAck = { white: false, black: false };
    room.updatedAt = serverTimestamp();
    incrementScore(room, winner);
    return room;
  });
}

export async function resetChessRoom(roomId: string) {
  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) return room;
    if (!room.finishAck) room.finishAck = { white: false, black: false };
    if (!room.players) room.players = { white: null, black: null };
    if (room.players.white && room.players.black) {
      const currentWhite = room.players.white;
      room.players.white = room.players.black;
      room.players.black = currentWhite;
    }
    room.status = room.players?.white && room.players?.black ? "PLAYING" : "LOBBY";
    room.fen = INITIAL_FEN;
    room.turn = "white";
    room.moves = [];
    room.winner = null;
    room.result = null;
    room.finishedAt = null;
    room.finishAck = { white: false, black: false };
    room.updatedAt = serverTimestamp();
    return room;
  });
}

export async function acknowledgeFinish(roomId: string, side: ChessSide) {
  await update(roomRef(roomId), {
    [`finishAck/${side}`]: true,
    updatedAt: serverTimestamp()
  });
}
