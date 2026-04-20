import { useEffect, useMemo, useState } from "react";
import type { PieceSymbol, Square } from "chess.js";
import { createChess, looseMovesFrom, type ChessSide, type LooseMove, type BoardMatrix } from "../logic/chessLogic";

const PROMOTION_PIECES: PieceSymbol[] = ["q", "r", "b", "n"];
const PROMOTION_UNICODE: Record<"w" | "b", Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟︎" }
};
const PROMOTION_LABEL: Record<PieceSymbol, string> = {
  q: "Hậu", r: "Xe", b: "Tượng", n: "Mã", k: "", p: ""
};

interface ChessBoardProps {
  fen: string;
  board: BoardMatrix;
  perspective: ChessSide;
  canMove: boolean;
  lastMove?: { from: Square; to: Square } | null;
  helperText?: string;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol | null) => void;
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

export default function ChessBoard({ fen, board, perspective, canMove, lastMove, helperText, onMove }: ChessBoardProps) {
  const chess = useMemo(() => createChess(fen), [fen]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<LooseMove[]>([]);
  const [promotionPrompt, setPromotionPrompt] = useState<{ from: Square; to: Square } | null>(null);

  const myColor: "w" | "b" = perspective === "white" ? "w" : "b";

  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
    setPromotionPrompt(null);
  }, [fen]);

  function handleSquareClick(square: Square) {
    if (!canMove) return;
    if (promotionPrompt) return;
    if (selected === square) {
      setSelected(null);
      setLegalMoves([]);
      return;
    }

    const piece = chess.get(square);

    if (piece && piece.color === myColor) {
      setSelected(square);
      setLegalMoves(looseMovesFrom(fen, square));
      return;
    }

    if (selected) {
      const matches = legalMoves.filter(m => m.to === square);
      if (!matches.length) return;
      const promotions = matches.filter(m => m.promotion);
      if (promotions.length > 1) {
        setPromotionPrompt({ from: selected, to: square });
        return;
      }
      const candidate = matches[0];
      onMove(selected, candidate.to, candidate.promotion);
      setSelected(null);
      setLegalMoves([]);
    }
  }

  function choosePromotion(piece: PieceSymbol) {
    if (!promotionPrompt) return;
    onMove(promotionPrompt.from, promotionPrompt.to, piece);
    setPromotionPrompt(null);
    setSelected(null);
    setLegalMoves([]);
  }

  const displayRanks = perspective === "white" ? ranks : [...ranks].reverse();
  const displayFiles = perspective === "white" ? files : [...files].reverse();

  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="grid grid-cols-8 w-full max-w-[520px] border border-slate-200 rounded-2xl overflow-hidden mx-auto sm:mx-0 shadow-lg shadow-indigo-50/60">
        {displayRanks.map(rank => {
          const rowIndex = ranks.indexOf(rank);
          return displayFiles.map(file => {
            const colIndex = files.indexOf(file);
            const square = `${file}${rank}` as Square;
            const piece = board[rowIndex][colIndex];
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selected === square;
            const isLegalTarget = legalMoves.some(m => m.to === square);
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const baseColor = isLight ? "bg-slate-100" : "bg-slate-400/60";
            const highlight = isSelected
              ? "shadow-[inset_0_0_0_3px_rgba(79,70,229,0.95)]"
              : isLastMove
                ? "shadow-[inset_0_0_0_2px_rgba(251,191,36,0.75)]"
                : "shadow-[inset_0_0_0_1px_rgba(148,163,184,0.45)]";
            return (
              <button
                key={square}
                type="button"
                className={[
                  "relative aspect-square flex items-center justify-center text-[clamp(1.8rem,2.5vw,2.4rem)] font-semibold transition-colors duration-150 focus:outline-none",
                  baseColor,
                  highlight,
                  canMove ? "hover:bg-indigo-100/60" : "cursor-default"
                ].join(" ")}
                onClick={() => handleSquareClick(square)}
              >
                {piece && (
                  <span className={piece.color === "w" ? "text-gray-800 drop-shadow-sm" : "text-gray-900 drop-shadow-sm"}>
                    {piece.unicode}
                  </span>
                )}
                {isLegalTarget && (
                  <span
                    className="absolute w-3 h-3 rounded-full bg-indigo-500/80"
                    style={{ transform: "translate(-50%, -50%)", top: "50%", left: "50%" }}
                  />
                )}
              </button>
            );
          });
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>{perspective === "white" ? "Góc nhìn quân Trắng" : "Góc nhìn quân Đen"}</span>
        {helperText && <span>{helperText}</span>}
      </div>
      {promotionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Chọn quân phong cấp</h3>
              <p className="text-sm text-gray-500 mt-1">Tốt đã tới hàng cuối — chọn quân để phong cấp.</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {PROMOTION_PIECES.map(piece => (
                <button
                  key={piece}
                  type="button"
                  onClick={() => choosePromotion(piece)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white py-3 hover:border-indigo-300 hover:bg-indigo-50 transition"
                >
                  <span className="text-3xl">{PROMOTION_UNICODE[myColor][piece]}</span>
                  <span className="text-xs text-gray-600">{PROMOTION_LABEL[piece]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPromotionPrompt(null)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
