import type { ChessSide } from "../logic/chessLogic";
import type { ChessPlayer } from "../services/chessRoomService";

interface PlayerInfoCardProps {
  label: string;
  player: ChessPlayer | null;
  side: ChessSide;
  isTurn: boolean;
  isMe: boolean;
  score?: number;
}

export default function PlayerInfoCard({ label, player, side, isTurn, isMe, score = 0 }: PlayerInfoCardProps) {
  return (
    <div className="rounded-xl border px-4 py-3 bg-white/80">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">
            {player ? player.name : "Dang trong"}
            {isMe && <span className="ml-2 text-xs text-indigo-600">(Ban)</span>}
          </p>
        </div>
        <div className="text-right space-y-1">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${side === "white" ? "bg-white text-gray-900 border" : "bg-gray-900 text-white"}`}>
            {side === "white" ? "Trang" : "Den"}
          </span>
          <p className="text-xs text-gray-500">Score: {score}</p>
        </div>
      </div>
      {isTurn && <p className="text-sm text-emerald-600 font-medium mt-1">Den luot {player ? player.name : "..."}</p>}
      {!player && <p className="text-sm text-gray-500 mt-1">Nguoi choi co the vao phong bang ma ben tren.</p>}
    </div>
  );
}
