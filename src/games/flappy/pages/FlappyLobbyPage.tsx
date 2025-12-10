import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureAnon } from "../../shared/firebase";
import { FLAPPY_HOME_PATH, FLAPPY_ROOM_PATH, FLAPPY_SOLO_PATH } from "../constants";
import { createFlappyRoom } from "../services/flappyRoomService";

const NAME_KEY = "flappy-player-name";

export default function FlappyLobbyPage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) setPlayerName(saved);
  }, []);

  async function handleCreate() {
    if (!playerName.trim()) return;
    setCreating(true);
    localStorage.setItem(NAME_KEY, playerName.trim());
    await ensureAnon(playerName.trim());
    const id = await createFlappyRoom(`${playerName.trim()} room`);
    navigate(`${FLAPPY_ROOM_PATH}/${id}`);
    setCreating(false);
  }

  function handleJoin() {
    if (!playerName.trim() || !roomCode.trim()) return;
    localStorage.setItem(NAME_KEY, playerName.trim());
    navigate(`${FLAPPY_ROOM_PATH}/${roomCode.trim().toUpperCase()}`);
  }

  return (
    <section className="space-y-10">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-indigo-600 font-semibold">New mode</p>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Flappy Battle</h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Choi don hoac tao phong toi da 4 nguoi. Moi nguoi co mot man rieng, khi nguoi cuoi cung rot xuong thi ket thuc,
          hien bang diem va cho san sang cho van moi.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 items-start">
        <article className="md:col-span-1 rounded-2xl border border-indigo-100 bg-white shadow-lg shadow-indigo-100/50 p-6 space-y-3">
          <h2 className="text-2xl font-semibold text-indigo-900">Choi don</h2>
          <p className="text-sm text-gray-600">
            Tap luyen nhay ong, luu diem cao nhat tren may. Tuong thich mobile, bam hay cham la bay.
          </p>
          <Link
            to={FLAPPY_SOLO_PATH}
            className="inline-flex items-center justify-center w-full mt-3 rounded-xl bg-indigo-600 text-white font-semibold px-4 py-3 hover:bg-indigo-500 transition"
          >
            Vao che do solo
          </Link>
        </article>

        <article className="md:col-span-2 rounded-2xl border bg-white shadow-sm p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Tao phong moi</h3>
              <p className="text-sm text-gray-500">Sinh ma 5 ky tu, chia link cho ban be.</p>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-gray-700">Ten hien thi</span>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Vi du: Minh"
                />
              </label>
              <button
                onClick={handleCreate}
                disabled={!playerName.trim() || creating}
                className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-4 py-3 disabled:opacity-50"
              >
                {creating ? "Dang tao..." : "Tao phong"}
              </button>
              <p className="text-xs text-gray-500">
                Khi tao phong ban se tu dong dang nhap an danh de luu diem.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Vao phong san co</h3>
              <p className="text-sm text-gray-500">Nhieu nhat 4 nguoi/ phong, khach khong chen vao slot.</p>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-gray-700">Ten hien thi</span>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Ban la ai?"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-gray-700">Ma phong</span>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value)}
                  placeholder="VD: FLPY1"
                />
              </label>
              <button
                onClick={handleJoin}
                disabled={!playerName.trim() || roomCode.trim().length < 3}
                className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 text-white font-semibold px-4 py-3 disabled:opacity-50"
              >
                Vao phong
              </button>
              <Link
                to={FLAPPY_HOME_PATH}
                className="text-xs text-gray-500 underline underline-offset-2 inline-flex"
              >
                Ve trang chu
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
