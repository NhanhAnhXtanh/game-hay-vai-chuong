export default function MoveList({ lastMove }: { lastMove: { r:number; c:number; by: "X"|"O" } | null }) {
    return (
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Nước gần nhất</h3>
        {lastMove ? (
          <div className="text-sm text-gray-700">({lastMove.r}, {lastMove.c}) bởi {lastMove.by}</div>
        ) : (
          <div className="text-sm text-gray-500">Chưa có</div>
        )}
      </div>
    );
  }
  