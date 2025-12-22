import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureAnon } from "../../shared/firebase";
import { TIC_TAC_TOE_GAME_PATH, TIC_TAC_TOE_HOME_PATH } from "../constants";
import { getRoom, resolveSecureTicket, joinRoom } from "../services/roomService";

export default function SecureRoomPage() {
  const [sp] = useSearchParams();
  const defaultToken = sp.get("token") || "";
  const nav = useNavigate();
  const [token, setToken] = useState(defaultToken);
  const [name, setName] = useState(localStorage.getItem("player-name") || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!token.trim() || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ticket = await resolveSecureTicket(token.trim());
      if (!ticket) throw new Error("Mã truy cập không hợp lệ hoặc đã hết hạn.");
      const room = await getRoom(ticket.roomId);
      if (!room) throw new Error("Phòng không tồn tại hoặc đã bị xoá.");
      const me = await ensureAnon(name.trim());
      localStorage.setItem("player-name", name.trim());
      await joinRoom(ticket.roomId, me.uid, name.trim(), undefined, ticket.passwordHash ?? undefined);
      nav(`${TIC_TAC_TOE_GAME_PATH}/${room.inviteCode}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể vào phòng bằng mã này.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Vào phòng qua mã truy cập</h1>
        <p className="text-sm text-gray-600 text-center">Dán mã truy cập bạn nhận được. Liên kết này không để lộ mật khẩu hay mã phòng.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Mã truy cập</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Dán mã truy cập"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tên hiển thị</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tên của bạn"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 disabled:opacity-50"
            onClick={handleJoin}
            disabled={loading || !token.trim() || !name.trim()}
          >
            {loading ? "Đang vào phòng..." : "Vào phòng"}
          </button>
          <button
            className="w-full rounded-lg border py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => nav(TIC_TAC_TOE_HOME_PATH)}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
