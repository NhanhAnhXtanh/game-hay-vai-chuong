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
  moves: ChessMove[];
  createdAt: number | object;
  updatedAt: number | object;
}

function roomRef(roomId: string) {
  return ref(chessDb, `${COLLECTION}/${roomId}`);
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
    const side =
      room.players.white?.uid === uid ? "white" :
      room.players.black?.uid === uid ? "black" :
      null;
    if (!side) return room;
    room.players[side] = null;
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

    (chess as unknown as { _makeMove: (move: unknown) => void })._makeMove(internalMove);

    const moveNumber = room.moves?.length ? Math.ceil((room.moves.length + 1) / 2) : 1;
    const newMove: ChessMove = {
      moveNumber,
      san: `${payload.from}-${payload.to}`,
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
    } else {
      room.status = "PLAYING";
      room.result = null;
      room.winner = null;
      room.finishedAt = null;
      room.finishAck = { white: false, black: false };
    }

    if (capturedPiece !== "k") {
      room.fen = computedFen;
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
  return possible.find((move: any) => move.from === fromIndex && move.to === toIndex);
}

export async function resignChess(roomId: string, uid: string) {
  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) return room;
    if (room.status !== "PLAYING") return room;
    if (!room.finishAck) room.finishAck = { white: false, black: false };
    if (typeof room.finishedAt === "undefined") room.finishedAt = null;
    if (!room.players) room.players = { white: null, black: null };
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
    return room;
  });
}

export async function resetChessRoom(roomId: string) {
  await runTransaction(roomRef(roomId), (room: ChessRoom | null) => {
    if (!room) return room;
    if (!room.finishAck) room.finishAck = { white: false, black: false };
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
