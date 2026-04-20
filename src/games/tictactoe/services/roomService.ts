import { db } from "../../shared/firebase";
import {
  ref, set, get, update, onValue, runTransaction, serverTimestamp, off, push,
  query, limitToLast
} from "firebase/database";
import { nanoid } from "nanoid";
import { emptyBoard, findWinningLine, SIZE, type Cell, type BoardCoord } from "../logic/gameLogic";

export type RoomStatus = "LOBBY" | "PLAYING" | "ROUND_END" | "DECISION" | "CLOSED";

export interface Player {
  uid: string;
  name: string;
  ready: boolean;
  score: number;
}

export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  createdAt: number;
}

type ChatMessageRecord = Omit<ChatMessage, "id">;

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
  winningLine: BoardCoord[] | null;
  drawOffer: { from: "X" | "O" } | null;
  endedBy: { type: "WIN" | "DRAW" | "SURRENDER"; by: "X" | "O" | null } | null;
  messages?: Record<string, ChatMessageRecord>;
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
    winningLine: null,
    drawOffer: null,
    endedBy: null,
    messages: {},
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
  const normalizedName = name.trim() || "Player";

  if (room.hasPassword) {
    if (!password) throw new Error("Cần mật khẩu");
    const ok = room.passwordHash === await sha256(password);
    if (!ok) throw new Error("Sai mật khẩu");
  }

  const existingSlot =
    players.X?.uid === uid ? "X" :
    players.O?.uid === uid ? "O" :
    null;

  if (existingSlot) {
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp()
    };
    if ((players as Record<string, Player | null>)[existingSlot]?.name !== normalizedName) {
      updates[`players/${existingSlot}/name`] = normalizedName;
    }
    await update(roomRef, updates);
    return existingSlot as "X" | "O";
  }

  const slot = !players.X ? "X" : (!players.O ? "O" : null);
  if (!slot) throw new Error("Phòng đã đủ 2 người");

  const nextPlayers = {
    ...players,
    [slot]: { uid, name: normalizedName, ready: false, score: 0 }
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

export function listenMessages(
  roomId: string,
  cb: (messages: ChatMessage[]) => void,
  limit = 50
) {
  const msgRef = ref(db, `rooms/${roomId}/messages`);
  const q = query(msgRef, limitToLast(limit));
  const unsub = onValue(q, snap => {
    const raw = (snap.val() ?? {}) as Record<string, ChatMessageRecord>;
    const list = Object.entries(raw)
      .map(([id, msg]) => ({
        id,
        uid: msg?.uid ?? "",
        name: msg?.name ?? "Người chơi",
        text: msg?.text ?? "",
        createdAt: typeof msg?.createdAt === "number" ? msg.createdAt : 0
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
    cb(list);
  });
  return () => { off(msgRef); unsub(); };
}

export async function setReady(roomId: string, side: "X" | "O", ready: boolean) {
  await update(ref(db, `rooms/${roomId}`), {
    [`players/${side}/ready`]: ready,
    updatedAt: serverTimestamp()
  });
}

export async function sendMessage(roomId: string, payload: { uid: string; name: string; text: string }) {
  const msgRef = ref(db, `rooms/${roomId}/messages`);
  const newRef = push(msgRef);
  if (!newRef) return;
  await set(newRef, {
    uid: payload.uid,
    name: payload.name,
    text: payload.text,
    createdAt: Date.now()
  });
}

export async function offerDraw(roomId: string, side: "X" | "O") {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room) return room;
    if (room.status !== "PLAYING") return room;
    if (room.drawOffer) return room;
    room.drawOffer = { from: side };
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

export async function respondDraw(roomId: string, side: "X" | "O", accept: boolean) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room) return room;
    if (room.status !== "PLAYING") return room;
    if (!room.drawOffer) return room;
    if (room.drawOffer.from === side) return room;

    if (accept) {
      room.status = "ROUND_END";
      room.winner = null;
      room.winningLine = null;
      room.endedBy = { type: "DRAW", by: room.drawOffer.from };
      if (room.players?.X) room.players.X.score = (room.players.X.score ?? 0) + 1;
      if (room.players?.O) room.players.O.score = (room.players.O.score ?? 0) + 1;
    }

    room.drawOffer = null;
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

export async function surrender(roomId: string, side: "X" | "O") {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room) return room;
    if (room.status !== "PLAYING") return room;
    const opponent = side === "X" ? "O" : "X";
    room.status = "ROUND_END";
    room.winner = opponent;
    room.winningLine = null;
    room.drawOffer = null;
    room.endedBy = { type: "SURRENDER", by: side };
    if (room.players?.[opponent]) {
      room.players[opponent]!.score = (room.players[opponent]!.score ?? 0) + 1;
    }
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

export async function startRound(roomId: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room) return room;
    if (!room.players) room.players = { X: null, O: null };
    if (room.status === "PLAYING") return room;
    if (room.status !== "LOBBY" && room.status !== "ROUND_END") return room;
    const haveBoth = !!room.players.X && !!room.players.O;
    if (haveBoth) {
      const prevX = room.players.X;
      room.players.X = room.players.O;
      room.players.O = prevX;
    }
    room.board = emptyBoard();
    room.turn = "X";
    room.status = "PLAYING";
    room.winner = null;
    room.lastMove = null;
    room.winningLine = null;
    room.drawOffer = null;
    room.endedBy = null;
    if (room.players.X) room.players.X.ready = false;
    if (room.players.O) room.players.O.ready = false;
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

export async function leaveRoom(roomId: string, side: "X" | "O") {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room) return room;
    if (!room.players) room.players = { X: null, O: null };
    const opponent = side === "X" ? "O" : "X";
    room.players[side] = null;
    if (room.players[opponent]) {
      room.players[opponent]!.score = 0;
      room.players[opponent]!.ready = false;
    }
    room.status = "LOBBY";
    room.board = emptyBoard();
    room.turn = "X";
    room.winner = null;
    room.lastMove = null;
    room.winningLine = null;
    room.drawOffer = null;
    room.endedBy = null;
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
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

    const winLine = findWinningLine(room.board, r, c, side);
    if (winLine) {
      room.winner = side;
      room.status = "ROUND_END";
      room.winningLine = winLine;
      room.endedBy = { type: "WIN", by: side };
      if (room.players[side]) room.players[side]!.score = (room.players[side]!.score ?? 0) + 1;
    } else {
      room.turn = side === "X" ? "O" : "X";
      room.winningLine = null;
      room.endedBy = null;
    }
    room.drawOffer = null;
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
