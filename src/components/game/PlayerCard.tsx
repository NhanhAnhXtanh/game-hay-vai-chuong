import type { Player } from "../../services/roomService";

export default function PlayerCard({
  label, player, highlight, me
}: {
  label: "X" | "O";
  player: Player | null | undefined;
  highlight: boolean;
  me: boolean;
}) {
  const bg = player ? (label==="X" ? "bg-blue-100" : "bg-red-100") : "bg-gray-100";
  return (
    <div className={`p-2 rounded ${bg} border ${highlight ? "border-green-500" : "border-transparent"}`}>
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-600">Player {label}</p>
          <p className="font-bold text-gray-900">
            {player?.name || "Đang chờ..."} {me ? "(Bạn)" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Score</p>
          <p className="font-semibold">{player?.score ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
