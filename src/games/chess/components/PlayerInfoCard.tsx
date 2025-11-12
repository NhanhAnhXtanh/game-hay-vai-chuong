import type { ChessSide } from "../logic/chessLogic";
import type { ChessPlayer } from "../services/chessRoomService";

interface PlayerInfoCardProps {
  label: string;
  player: ChessPlayer | null;
  side: ChessSide;
  isTurn: boolean;
  isMe: boolean;
}

export default function PlayerInfoCard({ label, player, side, isTurn, isMe }: PlayerInfoCardProps) {
  return (
    <div className="rounded-xl border px-4 py-3 bg-white/80">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">
            {player ? player.name : "Đang trống"}
            {isMe && <span className="ml-2 text-xs text-indigo-600">(Bạn)</span>}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${side === "white" ? "bg-white text-gray-900 border" : "bg-gray-900 text-white"}`}>
          {side === "white" ? "Trắng" : "Đen"}
        </span>
      </div>
      {isTurn && (
        <p className="text-sm text-emerald-600 font-medium mt-1">Đến lượt {player ? player.name : "..."}</p>
      )}
      {!player && <p className="text-sm text-gray-500 mt-1">Người chơi có thể vào phòng bằng mã ở trên.</p>}
    </div>
  );
}
