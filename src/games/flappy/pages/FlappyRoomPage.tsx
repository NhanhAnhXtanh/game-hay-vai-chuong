import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureAnon, auth } from "../../shared/firebase";
import FlappyViewport from "../components/FlappyViewport";
import { useFlappyEngine } from "../logic/flappyEngine";
import { FLAPPY_HOME_PATH, FLAPPY_MAX_PLAYERS, FLAPPY_ROOM_PATH } from "../constants";
import type { FlappyPlayerState, FlappyRoom } from "../types";
import {
  attemptStartFlappyRound,
  clearPlayerState,
  completeFlappyRound,
  joinFlappyRoom,
  leaveFlappyRoom,
  listenFlappyRoom,
  listenFlappyStates,
  persistPlayerState,
  setFlappyReady
} from "../services/flappyRoomService";

const NAME_KEY = "flappy-player-name";

export default function FlappyRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<FlappyRoom | null>(null);
  const [states, setStates] = useState<Record<string, FlappyPlayerState>>({});
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem(NAME_KEY) ?? "");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [spectator, setSpectator] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myUid = auth.currentUser?.uid ?? null;
  const isPlaying = room?.status === "PLAYING";
  const roundSeed = room?.seed ?? 1;
  const roundNumber = room?.round ?? 1;

  const engine = useFlappyEngine({
    seed: roundSeed,
    round: roundNumber,
    running: isPlaying && !spectator && !!myUid,
    onSnapshot: snap => {
      if (!roomId || !myUid || spectator) return;
      const payload: FlappyPlayerState = {
        ...snap,
        uid: myUid,
        name: playerName || "Guest",
        round: roundNumber,
        score: snap.score,
        updatedAt: Date.now()
      };
      persistPlayerState(roomId, payload).catch(() => {});
    }
  });

  useEffect(() => {
    if (!roomId) return;
    const unsubRoom = listenFlappyRoom(roomId, setRoom);
    const unsubStates = listenFlappyStates(roomId, setStates);
    return () => {
      unsubRoom();
      unsubStates();
    };
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!roomId || !playerName.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const user = await ensureAnon(playerName.trim());
        if (cancelled) return;
        const display = user.displayName?.trim() || playerName.trim();
        localStorage.setItem(NAME_KEY, display);
        await joinFlappyRoom(roomId, user.uid, display);
        setSpectator(false);
        setJoinError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Khong vao phong duoc.";
        setJoinError(msg);
        setSpectator(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, playerName]);

  useEffect(() => {
    if (!roomId || !myUid) return;
    return () => {
      leaveFlappyRoom(roomId, myUid).catch(() => {});
      clearPlayerState(roomId, myUid).catch(() => {});
    };
  }, [roomId, myUid]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        engine.flap();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [engine]);

  useEffect(() => {
    if (!room || room.status !== "PLAYING") return;
    const players = Object.values(room.players ?? {});
    if (!players.length) return;
    const activeStates = players
      .map(p => states[p.uid])
      .filter((s): s is FlappyPlayerState => Boolean(s) && s.round === room.round);
    if (activeStates.length < players.length) return;
    const anyAlive = activeStates.some(s => s.alive);
    if (anyAlive) return;
    completeFlappyRound(
      room.id,
      activeStates.map(s => ({ uid: s.uid, score: s.score }))
    ).catch(() => {});
  }, [room?.status, room?.round, room?.id, room?.players, states]);

  useEffect(() => {
    if (!room || room.status !== "PLAYING") return;
    engine.start();
  }, [room?.status, room?.round, roundSeed]);

  useEffect(() => {
    if (!room || room.status === "PLAYING") return;
    const players = Object.values(room.players ?? {});
    if (!players.length) return;
    const allReady = players.every(p => p.ready);
    if (allReady) {
      attemptStartFlappyRound(room.id).catch(() => {});
    }
  }, [room?.status, room?.players]);

  const playerList = useMemo(() => {
    if (!room?.players) return [];
    return Object.values(room.players).sort((a, b) => a.name.localeCompare(b.name));
  }, [room?.players]);

  const activeCount = playerList.length;
  const gridCols = activeCount >= 3 ? "md:grid-cols-2" : "md:grid-cols-1";
  const winnerNames = useMemo(() => {
    if (!room?.lastResult?.winners?.length) return "khong co";
    return room.lastResult.winners
      .map(id => room.players?.[id]?.name ?? id)
      .join(", ");
  }, [room?.lastResult?.winners, room?.players]);
  const me = myUid ? room?.players?.[myUid] : null;

  async function handleReadyToggle() {
    if (!roomId || !myUid) return;
    const me = room?.players?.[myUid];
    await setFlappyReady(roomId, myUid, !(me?.ready ?? false));
  }

  async function handleLeave() {
    if (!roomId) {
      navigate(FLAPPY_HOME_PATH);
      return;
    }
    if (myUid) {
      await leaveFlappyRoom(roomId, myUid);
      await clearPlayerState(roomId, myUid);
    }
    navigate(FLAPPY_HOME_PATH);
  }

  function handleCopy() {
    if (!roomId) return;
    try {
      navigator.clipboard.writeText(`${window.location.origin}${FLAPPY_ROOM_PATH}/${roomId}`);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!roomId) {
    return (
      <div className="p-6">
        <p>Khong tim thay phong.</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-semibold">Room {roomId}</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  room?.status === "PLAYING"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : room?.status === "FINISHED"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-slate-100 text-slate-800 border border-slate-200"
                }`}
              >
                {room?.status ?? "LOBBY"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Flappy room</h1>
            <p className="text-gray-600">
              Toi da {FLAPPY_MAX_PLAYERS} nguoi. Khi nguoi cuoi cung rot xuong, vong choi ket thuc va hien diem.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-200 transition"
            >
              {copied ? "Da sao chep" : "Copy link"}
            </button>
            <button
              onClick={handleLeave}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-gray-200/60"
            >
              Roi phong
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Ten:</label>
            <input
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Nhap ten"
            />
          </div>
          {!spectator && (
            <button
              onClick={handleReadyToggle}
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
              disabled={!myUid}
            >
              {me?.ready ? "Huy san sang" : "San sang"}
            </button>
          )}
          {room?.status === "FINISHED" && (
            <p className="text-sm text-gray-700">
              Tat ca bam "San sang" de bat dau van moi. Vong hien tai: {room.round ?? 0}
            </p>
          )}
          {joinError && <p className="text-sm text-red-600">{joinError}</p>}
          {spectator && (
            <p className="text-sm text-gray-600">
              Ban dang xem (phong du {FLAPPY_MAX_PLAYERS} nguoi). Khi co slot trong, bam Join lai.
            </p>
          )}
        </div>
      </header>

      {room?.lastResult && room.status === "FINISHED" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-amber-700 font-semibold">Vong {room.lastResult.round} ket thuc.</p>
            <p className="text-sm text-amber-800">
              Thang: {winnerNames} - Diem cao {room.lastResult.score}
            </p>
          </div>
          <div className="text-xs text-amber-700">Bam "San sang" de choi tiep.</div>
        </div>
      )}

      <div className={`grid gap-4 ${gridCols}`}>
        {playerList.map(player => {
          const liveState = player.uid === myUid ? engine.view : states[player.uid];
          const actualScore = liveState?.score ?? player.lastScore ?? 0;
          const alive = liveState ? (liveState.started && liveState.alive) : false;
          const label = player.uid === myUid ? "Ban" : player.name;
          return (
            <article
              key={player.uid}
              className="rounded-2xl border bg-white shadow-sm p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{player.name}</p>
                  <p className="text-xs text-gray-500">
                    {alive ? "Dang bay" : liveState?.started ? "Da rot" : "Chua bat dau"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{actualScore}</p>
                  <p className="text-xs text-gray-500">Best {player.best ?? 0} | Win {player.wins ?? 0}</p>
                </div>
              </div>
              <FlappyViewport
                state={liveState ?? null}
                highlight={player.uid === myUid}
                label={label}
                muted={room?.status !== "PLAYING"}
              />
            </article>
          );
        })}

        {playerList.length < FLAPPY_MAX_PLAYERS &&
          Array.from({ length: FLAPPY_MAX_PLAYERS - playerList.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="rounded-2xl border border-dashed bg-white/60 p-4 text-center text-sm text-gray-500"
            >
              Cho trong
            </div>
          ))}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Bang ti so</p>
            <p className="text-xs text-gray-500">Thang +1 diem thang, luu diem cao nhat.</p>
          </div>
          {room?.status === "PLAYING" && (
            <p className="text-xs text-indigo-700 font-semibold">Vong {room.round ?? 1}</p>
          )}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Nguoi choi</th>
                <th className="py-2">Win</th>
                <th className="py-2">Best</th>
                <th className="py-2">Lan moi</th>
              </tr>
            </thead>
            <tbody>
              {playerList.map(player => (
                <tr key={player.uid} className="border-t text-gray-800">
                  <td className="py-2">{player.name}</td>
                  <td className="py-2">{player.wins ?? 0}</td>
                  <td className="py-2">{player.best ?? 0}</td>
                  <td className="py-2">{player.lastScore ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200">Space</span>
          <span>hoac click/cham de dap canh. Toi da {FLAPPY_MAX_PLAYERS} nguoi / phong.</span>
        </div>
      </div>
    </section>
  );
}


