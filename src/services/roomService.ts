import { db } from "../firebase";
import {
  ref, set, get, update, onValue, runTransaction, serverTimestamp, off
} from "firebase/database";
import { nanoid } from "nanoid";
import { emptyBoard, checkWin, SIZE, type Cell } from "./gameLogic";

export type RoomStatus = "LOBBY" | "PLAYING" | "ROUND_END" | "DECISION" | "CLOSED";

export interface Player {
  uid: string;
  name: string;
  ready: boolean;
  score: number;
}

export interface Room {
  id: string;
  name: string;
  hasPassword: boolean;
  passwordHash: string | null;
  status: RoomStatus;
  board: Cell[][];
  turn: "X" | "O";
  winner: "X" | "O" | null;
  players: { X: Player | null; O: Player | null };
  lastMove: { r: number; c: number; by: "X" | "O" } | null;
  createdAt: number | object;
  updatedAt: number | object;
}

export async function createRoom(name: string, password?: string) {
  const id = nanoid(6).toUpperCase();
  const roomRef = ref(db, `rooms/${id}`);
  const payload: Room = {
    id,
    name,
    hasPassword: !!password,
    passwordHash: password ? await sha256(password) : null,
    status: "LOBBY",
    board: emptyBoard(),
    turn: "X",
    winner: null,
    players: { X: null, O: null },
    lastMove: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(roomRef, payload);
  return id;
}

export async function joinRoom(roomId: string, uid: string, name: string, password?: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error("Phòng không tồn tại");
  const room = snap.val() as Room;
  const players = room.players ?? { X: null, O: null };

  if (room.hasPassword) {
    if (!password) throw new Error("Cần mật khẩu");
    const ok = room.passwordHash === await sha256(password);
    if (!ok) throw new Error("Sai mật khẩu");
  }

  const slot = !players.X ? "X" : (!players.O ? "O" : null);
  if (!slot) throw new Error("Phòng đã đủ 2 người");

  const nextPlayers = {
    ...players,
    [slot]: { uid, name, ready: false, score: 0 }
  } as Room["players"];

  await update(roomRef, {
    players: nextPlayers,
    updatedAt: serverTimestamp()
  });

  return slot as "X" | "O";
}

export function listenRoom(roomId: string, cb: (room: Room | null) => void) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const unsub = onValue(roomRef, s => cb(s.val()));
  return () => { off(roomRef); unsub(); };
}

export async function setReady(roomId: string, side: "X" | "O", ready: boolean) {
  await update(ref(db, `rooms/${roomId}`), {
    [`players/${side}/ready`]: ready,
    updatedAt: serverTimestamp()
  });
}

export async function startRound(roomId: string) {
  await update(ref(db, `rooms/${roomId}`), {
    status: "PLAYING",
    board: emptyBoard(),
    turn: "X",
    winner: null,
    lastMove: null,
    "players/X/ready": false,
    "players/O/ready": false,
    updatedAt: serverTimestamp()
  });
}

export async function leaveRoom(roomId: string, side: "X" | "O") {
  const r = ref(db, `rooms/${roomId}`);
  await update(r, {
    [`players/${side}`]: null,
    status: "LOBBY",
    updatedAt: serverTimestamp()
  });
}

export async function placeMove(roomId: string, side: "X" | "O", r: number, c: number) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room) return room;
    if (room.status !== "PLAYING") return room;
    if (room.turn !== side) return room;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return room;
    if (room.board[r][c] !== ".") return room;

    // đặt quân
    const b = room.board.map(row => row.slice());
    b[r][c] = side;
    room.board = b as Cell[][];
    room.lastMove = { r, c, by: side };

    const won = checkWin(room.board, r, c, side);
    if (won) {
      room.winner = side;
      room.status = "ROUND_END";
      if (room.players[side]) room.players[side]!.score = (room.players[side]!.score ?? 0) + 1;
    } else {
      room.turn = side === "X" ? "O" : "X";
    }
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
