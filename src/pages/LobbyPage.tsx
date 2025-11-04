import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureAnon } from "../firebase";
import { createRoom } from "../services/roomService";

export default function LobbyPage() {
  const nav = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("player-name") || "";
    setPlayerName(saved);
  }, []);

  async function onCreate() {
    if (!playerName.trim()) return;
    localStorage.setItem("player-name", playerName);
    await ensureAnon(playerName);
    const id = await createRoom("Phòng 16x16", password || undefined);
    const url = password
      ? `/game/${id}?pw=${encodeURIComponent(password)}`
      : `/game/${id}`;
    nav(url);
  }

  function onJoin() {
    if (!playerName.trim() || !roomId.trim()) return;
    localStorage.setItem("player-name", playerName);
    nav(`/game/${roomId.toUpperCase()}?pw=${encodeURIComponent(password)}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-4xl font-bold">Gomoku 16×16</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">Tạo phòng</h2>
          <input className="w-full mb-3 border rounded px-3 py-2"
                 placeholder="Tên của bạn"
                 value={playerName} onChange={e=>setPlayerName(e.target.value)} />
          <input className="w-full mb-4 border rounded px-3 py-2"
                 placeholder="Mật khẩu (tuỳ chọn)"
                 value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="px-4 py-2 rounded bg-blue-600 text-white w-full"
                  onClick={onCreate} disabled={!playerName.trim()}>
            Tạo phòng
          </button>
        </div>

        <div className="rounded-xl border p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">Vào phòng</h2>
          <input className="w-full mb-3 border rounded px-3 py-2"
                 placeholder="Tên của bạn"
                 value={playerName} onChange={e=>setPlayerName(e.target.value)} />
          <input className="w-full mb-3 border rounded px-3 py-2"
                 placeholder="Mã phòng"
                 value={roomId} onChange={e=>setRoomId(e.target.value)} />
          <input className="w-full mb-4 border rounded px-3 py-2"
                 placeholder="Mật khẩu (nếu có)"
                 value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="px-4 py-2 rounded bg-indigo-600 text-white w-full"
                  onClick={onJoin} disabled={!playerName.trim() || !roomId.trim()}>
            Vào phòng
          </button>
        </div>
      </div>
    </div>
  );
}
