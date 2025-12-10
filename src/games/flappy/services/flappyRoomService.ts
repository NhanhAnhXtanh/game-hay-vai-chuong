import { nanoid } from "nanoid";
import { off, onValue, ref, runTransaction, serverTimestamp, set, type Unsubscribe } from "firebase/database";
import { db } from "../../shared/firebase";
import { FLAPPY_MAX_PLAYERS } from "../constants";
import type { FlappyPlayerState, FlappyRoom } from "../types";

const ROOM_PATH = "flappyRooms";
const STATE_PATH = "flappyStates";

function roomRef(roomId: string) {
  return ref(db, `${ROOM_PATH}/${roomId}`);
}

function statesRef(roomId: string) {
  return ref(db, `${STATE_PATH}/${roomId}`);
}

function playerStateRef(roomId: string, uid: string) {
  return ref(db, `${STATE_PATH}/${roomId}/${uid}`);
}

export async function createFlappyRoom(name: string) {
  const id = nanoid(5).toUpperCase();
  const payload: FlappyRoom = {
    id,
    name: name || "Flappy room",
    status: "LOBBY",
    round: 0,
    seed: Math.floor(Math.random() * 1_000_000_000),
    players: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(roomRef(id), payload);
  return id;
}

export function listenFlappyRoom(roomId: string, cb: (room: FlappyRoom | null) => void): Unsubscribe {
  const refInstance = roomRef(roomId);
  const unsub = onValue(refInstance, snap => cb(snap.val()));
  return () => {
    off(refInstance);
    unsub();
  };
}

export function listenFlappyStates(
  roomId: string,
  cb: (states: Record<string, FlappyPlayerState>) => void
): Unsubscribe {
  const refInstance = statesRef(roomId);
  const unsub = onValue(refInstance, snap => cb((snap.val() as Record<string, FlappyPlayerState>) ?? {}));
  return () => {
    off(refInstance);
    unsub();
  };
}

export async function joinFlappyRoom(roomId: string, uid: string, name: string) {
  const normalized = name.trim() || "Khach";
  let err: Error | null = null;
  const result = await runTransaction(roomRef(roomId), (room: FlappyRoom | null) => {
    if (!room) {
      err = new Error("Phong khong ton tai");
      return room;
    }
    if (!room.players) room.players = {};
    const players = room.players;
    const existing = players[uid];
    const filled = Object.values(players).length;
    if (!existing && filled >= FLAPPY_MAX_PLAYERS) {
      err = new Error("Phong da du 4 nguoi");
      return room;
    }
    players[uid] = existing
      ? { ...existing, name: normalized }
      : { uid, name: normalized, ready: false, wins: 0, best: 0, lastScore: 0 };
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
  if (!result.committed) {
    throw err ?? new Error("Khong tham gia duoc phong");
  }
}

export async function leaveFlappyRoom(roomId: string, uid: string) {
  await runTransaction(roomRef(roomId), (room: FlappyRoom | null) => {
    if (!room || !room.players) return room;
    if (!room.players[uid]) return room;
    const next = { ...room.players };
    delete next[uid];
    room.players = next;
    const remaining = Object.keys(next).length;
    if (remaining === 0) {
      room.status = "LOBBY";
    }
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
  await clearPlayerState(roomId, uid);
}

export async function setFlappyReady(roomId: string, uid: string, ready: boolean) {
  await runTransaction(roomRef(roomId), (room: FlappyRoom | null) => {
    if (!room || !room.players || !room.players[uid]) return room;
    room.players[uid] = { ...room.players[uid], ready };
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}

export async function attemptStartFlappyRound(roomId: string) {
  const result = await runTransaction(roomRef(roomId), (room: FlappyRoom | null) => {
    if (!room) return room;
    const players = room.players ?? {};
    const list = Object.values(players);
    if (room.status === "PLAYING") return room;
    if (!list.length) return room;
    const allReady = list.every(p => p?.ready);
    if (!allReady) return room;
    room.status = "PLAYING";
    room.round = (room.round ?? 0) + 1;
    room.seed = Math.floor(Math.random() * 1_000_000_000);
    room.roundStartedAt = serverTimestamp() as unknown as number;
    room.lastResult = null as unknown as FlappyRoom["lastResult"];
    room.updatedAt = serverTimestamp() as unknown as number;
    room.players = list.reduce<Record<string, FlappyRoom["players"][string]>>((acc, p) => {
      acc[p.uid] = { ...p, ready: false, lastScore: 0 };
      return acc;
    }, {});
    return room;
  });
  if (result.committed && result.snapshot?.val()?.status === "PLAYING") {
    await set(statesRef(roomId), null);
  }
}

export async function persistPlayerState(roomId: string, state: FlappyPlayerState) {
  await set(playerStateRef(roomId, state.uid), state);
}

export async function clearPlayerState(roomId: string, uid: string) {
  await set(playerStateRef(roomId, uid), null);
}

export async function completeFlappyRound(roomId: string, results: { uid: string; score: number }[]) {
  await runTransaction(roomRef(roomId), (room: FlappyRoom | null) => {
    if (!room || room.status !== "PLAYING" || !room.players) return room;
    const bestScore = results.reduce((max, r) => Math.max(max, r.score), 0);
    const winners = results.filter(r => r.score === bestScore).map(r => r.uid);
    const nextPlayers: FlappyRoom["players"] = { ...room.players };
    results.forEach(r => {
      const player = nextPlayers[r.uid];
      if (!player) return;
      player.lastScore = r.score;
      player.best = Math.max(player.best ?? 0, r.score);
      if (winners.includes(r.uid)) {
        player.wins = (player.wins ?? 0) + 1;
      }
    });
    room.players = nextPlayers;
    room.status = "FINISHED";
    room.lastResult = {
      winners,
      score: bestScore,
      round: room.round
    };
    room.updatedAt = serverTimestamp() as unknown as number;
    return room;
  });
}
