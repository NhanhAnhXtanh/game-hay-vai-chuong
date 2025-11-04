import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ensureAnon } from "../firebase";
import {
  listenRoom, joinRoom, leaveRoom, placeMove,
  startRound, setReady, type Room
} from "../services/roomService";
import GameBoard from "../components/game/GameBoard";

export default function GamePage() {
  const { roomId } = useParams();
  const [sp] = useSearchParams();
  const pw = sp.get("pw") || undefined;

  const nav = useNavigate();
  const meName = useMemo(()=>localStorage.getItem("player-name") || "Player", []);
  const [room, setRoom] = useState<Room|null>(null);
  const [side, setSide] = useState<"X"|"O"|null>(null);
  const [joinError, setJoinError] = useState<string|null>(null);

  useEffect(() => {
    let off: (()=>void)|null = null;
    (async () => {
      const me = await ensureAnon(meName);
      try {
        const s = await joinRoom(roomId!, me.uid, me.displayName || meName, pw);
        setSide(s);
        setJoinError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không thể tham gia phòng.";
        setJoinError(msg);
        setSide(null);
      }
      off = listenRoom(roomId!, setRoom);
    })();
    return () => { if (off) off(); };
  }, [roomId, pw, meName]);

  async function onMove(r:number, c:number) {
    if (!room || !side) return;
    if (room.status !== "PLAYING") return;
    await placeMove(roomId!, side, r, c);
  }

  async function onReadyClick() {
    if (!side || !room) return;
    const myReady = room.players?.[side]?.ready ?? false;
    await setReady(roomId!, side, !myReady);
  }

  async function onPlayAgain() { await startRound(roomId!); }
  async function onLeave() { if (side) await leaveRoom(roomId!, side); nav("/"); }

  const bothReady = !!room?.players?.X?.ready && !!room?.players?.O?.ready;

  useEffect(() => {
    if (room && room.status==="LOBBY" && bothReady) startRound(roomId!);
  }, [room, bothReady, roomId]);

  if (!room) return <div className="p-6">Đang tải phòng…</div>;

  const playerX = room.players?.X ?? null;
  const playerO = room.players?.O ?? null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Phòng {roomId}</h1>
        <button className="px-3 py-2 rounded border" onClick={()=>navigator.clipboard.writeText(roomId!)}>Copy mã</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-xl border p-6 bg-white">
          <GameBoard board={room.board} onMove={onMove} lastMove={room.lastMove} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-semibold mb-2">Người chơi</h3>
            <div className="p-2 rounded mb-2 bg-blue-50">
              <div className="flex justify-between">
                <span>X: {playerX?.name || "Trống"}</span>
                <span>Score: {playerX?.score ?? 0}</span>
              </div>
            </div>
            <div className="p-2 rounded bg-red-50">
              <div className="flex justify-between">
                <span>O: {playerO?.name || "Trống"}</span>
                <span>Score: {playerO?.score ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4 bg-white space-y-3">
            {room.status==="LOBBY" && (
              <>
                <div>Trạng thái: Phòng chờ</div>
                {joinError && (
                  <div className="text-sm text-red-600">{joinError}</div>
                )}
                {!joinError && !side && (
                  <div className="text-sm text-gray-600">Phòng đã đủ người, bạn đang xem.</div>
                )}
                <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onReadyClick}
                        disabled={!side}>
                  {side && room.players?.[side]?.ready ? "Huỷ sẵn sàng" : "Sẵn sàng"}
                </button>
              </>
            )}

            {room.status==="PLAYING" && (
              <div>
                <div>Đang chơi. Lượt: {room.turn==="X" ? playerX?.name : playerO?.name}</div>
                <button className="px-4 py-2 rounded border mt-2" onClick={onLeave}>Rời phòng</button>
              </div>
            )}

            {room.status==="ROUND_END" && (
              <div>
                <div className="mb-2">Kết thúc ván. Thắng: {room.winner==="X" ? playerX?.name : playerO?.name}</div>
                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onPlayAgain}>Chơi tiếp</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
