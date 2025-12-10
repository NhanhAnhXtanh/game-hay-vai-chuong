import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureChessAnon } from "../services/chessAuthService";
import { createChessRoom } from "../services/chessRoomService";
import { CHESS_GAME_PATH } from "../constants";

const NAME_KEY = "chess-player-name";

export default function ChessLobbyPage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlayerName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  async function handleCreate() {
    if (!playerName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      localStorage.setItem(NAME_KEY, playerName);
      await ensureChessAnon(playerName);
      const roomId = await createChessRoom(`${playerName} room`);
      navigate(`${CHESS_GAME_PATH}/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the tao phong.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim() || !roomCode.trim()) return;
    setError(null);
    try {
      localStorage.setItem(NAME_KEY, playerName);
      await ensureChessAnon(playerName);
      navigate(`${CHESS_GAME_PATH}/${roomCode.trim().toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the vao phong.");
    }
  }

  return (
    <section className="space-y-10 text-gray-900">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 font-semibold mb-3">Chess sandbox</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Chơi cờ vua realtime</h1>
        <p className="text-base text-gray-600 max-w-3xl mx-auto">
          Phòng cờ vua dùng Firebase riêng (project Chess) giúp bạn tạo link, mời một đối thủ và theo dõi từng nước đi
          được đồng bộ tức thì. Đăng nhập ẩn danh là đủ để bắt đầu.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-indigo-100 bg-white/95 shadow-lg shadow-indigo-100/60 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Tạo phòng mới</h2>
            <p className="text-sm text-gray-500">Sinh mã 5 ký tự, chia sẻ cùng URL cho bạn bè.</p>
          </div>
          <label className="space-y-1 block">
            <span className="text-sm font-medium text-gray-700">Tên của bạn</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Ví dụ: Nhat Anh"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleCreate}
            disabled={!playerName.trim() || creating}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Đang tạo..." : "Tạo phòng và lấy mã"}
          </button>
          <p className="text-xs text-gray-500 text-center">Bạn sẽ tự động đăng nhập ẩn danh khi tạo phòng.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/95 shadow-lg shadow-slate-100 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Tham gia phòng</h2>
            <p className="text-sm text-gray-500">Nhập mã phòng mà chủ phòng gửi cho bạn.</p>
          </div>
          <label className="space-y-1 block">
            <span className="text-sm font-medium text-gray-700">Tên của bạn</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Tên hiển thị"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-sm font-medium text-gray-700">Mã phòng</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              placeholder="VD: A1B2C"
            />
          </label>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!playerName.trim() || roomCode.trim().length < 3}
            className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Vào phòng
          </button>
          <p className="text-xs text-gray-500 text-center">Khi phòng đủ hai người, ván cờ sẽ bắt đầu tự động.</p>
        </article>
      </div>
    </section>
  );
}
