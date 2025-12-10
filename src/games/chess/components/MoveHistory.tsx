import type { ChessMove } from "../services/chessRoomService";

interface MoveHistoryProps {
  moves: ChessMove[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  if (!moves.length) {
    return (
      <div className="rounded-xl border px-4 py-3 bg-white/70">
        <p className="text-sm text-gray-500">Chưa có nước đi nào.</p>
      </div>
    );
  }

  const grouped: Array<{ moveNumber: number; white?: ChessMove; black?: ChessMove }> = [];

  moves.forEach(move => {
    const index = move.moveNumber - 1;
    if (!grouped[index]) grouped[index] = { moveNumber: move.moveNumber };
    if (move.by === "white") grouped[index].white = move;
    else grouped[index].black = move;
  });

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-widest">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Trắng</th>
            <th className="px-3 py-2 text-left">Đen</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(row => (
            <tr key={row.moveNumber} className="border-t">
              <td className="px-3 py-2 font-semibold text-gray-700">{row.moveNumber}</td>
              <td className="px-3 py-2 text-gray-800">{row.white?.san ?? ""}</td>
              <td className="px-3 py-2 text-gray-800">{row.black?.san ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
