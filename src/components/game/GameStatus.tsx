import type { Room } from "../../services/roomService";
import { Button } from "../ui/button";

export default function GameStatus({
  status, currentTurnName, winner, onReady, mySide, room, onPlayAgain, onLeave
}: {
  status: Room["status"];
  currentTurnName: string;
  winner: "X" | "O" | null;
  onReady: (ready: boolean)=>void;
  mySide: "X" | "O" | null;
  room: Room | null;
  onPlayAgain: ()=>void;
  onLeave: ()=>void;
}) {
  if (!room) return <p>Đang tải...</p>;

  if (status === "LOBBY") {
    const myReady = mySide ? room.players[mySide!]?.ready : false;
    return (
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Phòng chờ</h3>
        <p className="text-gray-700 mb-3">Chờ đủ 2 người và cả hai bấm Sẵn sàng</p>
        {mySide && (
          <Button onClick={()=>onReady(!myReady)} variant={myReady ? "outline" : undefined}>
            {myReady ? "Huỷ sẵn sàng" : "Sẵn sàng"}
          </Button>
        )}
        <div className="mt-4">
          <Button variant="outline" onClick={onLeave}>Rời phòng</Button>
        </div>
      </div>
    );
  }

  if (status === "PLAYING") {
    return (
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Đang chơi</h3>
        <p className="text-sm text-gray-600 mb-1">Lượt hiện tại:</p>
        <p className="font-bold">{currentTurnName}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={onLeave}>Rời phòng</Button>
        </div>
      </div>
    );
  }

  if (status === "ROUND_END") {
    const winnerName = winner === "X" ? room.players.X?.name : room.players.O?.name;
    return (
      <div>
        <p className="text-green-600 font-bold mb-3">Kết thúc ván!</p>
        <p className="text-sm text-gray-600 mb-1">Người thắng:</p>
        <p className="font-bold text-gray-900 mb-4">{winnerName}</p>
        <Button onClick={onPlayAgain} className="w-full">Chơi tiếp</Button>
        <div className="mt-4">
          <Button variant="outline" onClick={onLeave}>Rời phòng</Button>
        </div>
      </div>
    );
  }

  if (status === "DECISION") {
    return (
      <div>
        <p className="text-sm text-gray-600 mb-3">Đang chờ quyết định...</p>
      </div>
    );
  }

  return <p>Phòng đã đóng.</p>;
}
