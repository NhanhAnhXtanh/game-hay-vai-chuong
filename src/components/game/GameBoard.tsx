import { type Cell, SIZE } from "../../services/gameLogic";

export default function GameBoard({
  board,
  onMove,
  lastMove
}: {
  board: Cell[][];
  onMove: (r:number, c:number)=>void;
  lastMove: { r:number; c:number; by: "X"|"O" } | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative inline-block">
        <div
          className="bg-amber-100 border-4 border-amber-900 p-2"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gap: "0"
          }}
        >
          {Array.from({ length: SIZE }).map((_, r) =>
            Array.from({ length: SIZE }).map((_, c) => {
              const v = board?.[r]?.[c] ?? ".";
              const isX = v === "X";
              const isO = v === "O";
              const isLast = lastMove && lastMove.r === r && lastMove.c === c;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => onMove(r, c)}
                  className={`
                    w-8 h-8 border border-amber-700 flex items-center justify-center relative
                    ${v === "." ? "hover:bg-amber-200 cursor-pointer" : "cursor-not-allowed"}
                  `}
                >
                  {isX && <div className="w-6 h-6 bg-blue-500 rounded-full"></div>}
                  {isO && <div className="w-6 h-6 bg-red-500 rounded-full"></div>}
                  {isLast && <div className="absolute inset-0 ring-2 ring-green-500 rounded-sm pointer-events-none"></div>}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="text-sm text-gray-600 text-center">
        <p>X: Xanh | O: Đỏ | 5 liên tiếp để thắng</p>
      </div>
    </div>
  );
}
