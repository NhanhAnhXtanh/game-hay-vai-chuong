import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PieceSymbol, Square } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import PlayerInfoCard from "../components/PlayerInfoCard";
import MoveHistory from "../components/MoveHistory";
import { ensureChessAnon } from "../services/chessAuthService";
import {
  listenChessRoom,
  joinChessRoom,
  leaveChessRoom,
  makeChessMove,
  resignChess,
  resetChessRoom,
  acknowledgeFinish,
  type ChessRoom
} from "../services/chessRoomService";
import type { ChessSide, HistoryMove } from "../logic/chessLogic";
import { boardFromMoves } from "../logic/chessLogic";
import { chessAuth } from "../../shared/firebase";
import { CHESS_HOME_PATH } from "../constants";

const NAME_KEY = "chess-player-name";

const STATUS_STYLES: Record<ChessRoom["status"], { label: string; className: string }> = {
  LOBBY: { label: "Đang chờ", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  PLAYING: { label: "Đang chơi", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  CHECKMATE: { label: "Chiếu bí", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  DRAW: { label: "Hòa", className: "bg-slate-50 text-slate-700 border border-slate-200" },
  STALEMATE: { label: "Hòa (stalemate)", className: "bg-slate-50 text-slate-700 border border-slate-200" },
  RESIGN: { label: "Xin thua", className: "bg-rose-50 text-rose-700 border border-rose-200" }
};

export default function ChessGamePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ChessRoom | null>(null);
  const [side, setSide] = useState<ChessSide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    const unsubscribe = listenChessRoom(roomId, snapshot => {
      setRoom(snapshot);
      setLoading(false);
    });

    const join = async () => {
      try {
        const storedName = localStorage.getItem(NAME_KEY) || "Chess guest";
        const user = await ensureChessAnon(storedName);
        const seat = await joinChessRoom(roomId, user.uid, storedName);
        setSide(seat);
        joinedRef.current = true;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể vào phòng, bạn đang xem với tư cách khán giả.");
      }
    };
    join();

    return () => {
      unsubscribe();
      if (joinedRef.current && chessAuth.currentUser) {
        leaveChessRoom(roomId, chessAuth.currentUser.uid).catch(() => {});
      }
    };
  }, [roomId]);

  const lastMove = room?.moves?.[room.moves.length - 1];
  const myUid = chessAuth.currentUser?.uid;
  const isPlaying = room?.status === "PLAYING";
  const isMyTurn = Boolean(room && side && isPlaying && room.turn === side);

  async function handleMove(from: Square, to: Square, promotion?: PieceSymbol | null) {
    if (!roomId || !myUid) return;
    try {
      await makeChessMove(roomId, { from, to, promotion, uid: myUid });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thực hiện nước đi.");
    }
  }

  async function handleClaimSeat() {
    if (!roomId) return;
    try {
      const storedName = localStorage.getItem(NAME_KEY) || "Chess guest";
      const user = await ensureChessAnon(storedName);
      const seat = await joinChessRoom(roomId, user.uid, storedName);
      setSide(seat);
      joinedRef.current = true;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể vào làm người chơi.");
    }
  }

  async function handleResign() {
    if (!roomId || !myUid) return;
    await resignChess(roomId, myUid);
  }

  async function handleReset() {
    if (!roomId) return;
    await resetChessRoom(roomId);
  }

  async function handleAcknowledge() {
    if (!roomId || !side) return;
    await acknowledgeFinish(roomId, side);
  }

  async function handleLeave() {
    if (!roomId || !myUid) {
      navigate(CHESS_HOME_PATH);
      return;
    }
    await leaveChessRoom(roomId, myUid);
    joinedRef.current = false;
    navigate(CHESS_HOME_PATH);
  }

  const helperText = useMemo(() => {
    if (!room) return "";
    let text = "";
    switch (room.status) {
      case "LOBBY":
        text = "Chờ đủ 2 người chơi.";
        break;
      case "PLAYING":
        text = room.turn === "white" ? "Lượt quân Trắng" : "Lượt quân Đen";
        break;
      case "CHECKMATE":
        text = room.winner ? `${room.winner === "white" ? "Trắng" : "Đen"} thắng (chiếu bí)` : "Đã chiếu bí";
        break;
      case "RESIGN":
        text = room.winner ? `${room.winner === "white" ? "Trắng" : "Đen"} thắng (đối thủ xin thua)` : "Ván đấu kết thúc";
        break;
      case "DRAW":
        text = "Ván cờ hòa.";
        break;
      case "STALEMATE":
        text = "Hòa do hết nước đi hợp lệ.";
        break;
      default:
        text = "";
    }
    if (!side) text = text ? `${text} • Bạn đang xem` : "Bạn đang xem ván đấu này.";
    return text;
  }, [room, side]);

  const historyMoves = useMemo<HistoryMove[]>(() => {
    if (!room?.moves) return [];
    return room.moves.map(move => ({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      captured: move.captured
    }));
  }, [room?.moves]);
  const boardMatrix = useMemo(() => boardFromMoves(historyMoves), [historyMoves]);

  const players = room?.players ?? { white: null, black: null };
  const hasFinished = !!(room && room.status !== "PLAYING" && room.status !== "LOBBY");
  const finishedAtMs = hasFinished && room && typeof room.finishedAt === "number" ? room.finishedAt : null;
  const delayActive = Boolean(hasFinished && finishedAtMs && now - finishedAtMs < 5000);
  const countdown = delayActive && finishedAtMs ? Math.ceil((5000 - (now - finishedAtMs)) / 1000) : 0;
  const myAck = side ? room?.finishAck?.[side] : false;
  const bothAck = Boolean(room?.finishAck?.white && room?.finishAck?.black);
  const canReset = Boolean(hasFinished && bothAck);
  const finishMessage = hasFinished
    ? room.winner
      ? `${room.winner === "white" ? "Trắng" : "Đen"} thắng (${room.status.toLowerCase()})`
      : room.status === "DRAW"
        ? "Ván cờ hòa."
        : "Trận đấu đã kết thúc."
    : "";
  const seatAvailable = !side && (!players.white || !players.black);
  const statusBadge = room ? STATUS_STYLES[room.status] : null;

  if (loading) {
    return <p className="text-center text-gray-600">Đang tải phòng cờ vua...</p>;
  }

  if (!room) {
    return (
      <div className="text-center space-y-3">
        <p className="text-2xl font-semibold text-gray-900">Không tìm thấy phòng.</p>
        <button
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate(CHESS_HOME_PATH)}
        >
          Quay về sảnh
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-8 text-gray-900">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-semibold">Phòng {room.id}</p>
              {statusBadge && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">{room.name}</h1>
            <p className="text-gray-600 mt-2">{helperText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                try {
                  navigator.clipboard.writeText(window.location.href);
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-xl border border-gray-200 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-200 transition"
            >
              Sao chép link
            </button>
            <button
              onClick={handleLeave}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-gray-200/60"
            >
              Rời phòng
            </button>
          </div>
        </div>
        {hasFinished && (
          <div className="rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 space-y-2">
            <p className="text-lg font-semibold text-indigo-900">{finishMessage}</p>
            {delayActive ? (
              <p className="text-sm text-indigo-700">Chờ {countdown}s trước khi xác nhận ván mới…</p>
            ) : (
              side && (
                <button
                  disabled={Boolean(myAck)}
                  onClick={handleAcknowledge}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-60"
                >
                  {myAck ? "Bạn đã sẵn sàng" : "Tôi đã sẵn sàng ván mới"}
                </button>
              )
            )}
            <p className="text-xs text-gray-600">
              {bothAck ? "Cả hai người chơi đã xác nhận – có thể bấm Bắt đầu ván mới." : "Đang chờ cả hai người chơi xác nhận."}
            </p>
          </div>
        )}
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
          <div className="rounded-3xl border border-white/70 bg-white/95 shadow-xl shadow-indigo-50 p-4 sm:p-6">
            <ChessBoard
              fen={room.fen}
              board={boardMatrix}
              perspective={side ?? "white"}
              canMove={Boolean(isMyTurn && room.status === "PLAYING")}
              lastMove={lastMove ? { from: lastMove.from, to: lastMove.to } : null}
              helperText={helperText}
              onMove={handleMove}
            />
          </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm space-y-4 p-4">
            <PlayerInfoCard
              label="Người chơi 1"
              player={players.white}
              side="white"
              isTurn={room.turn === "white" && room.status === "PLAYING"}
              isMe={players.white?.uid === myUid}
            />
            <PlayerInfoCard
              label="Người chơi 2"
              player={players.black}
              side="black"
              isTurn={room.turn === "black" && room.status === "PLAYING"}
              isMe={players.black?.uid === myUid}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            {seatAvailable && (
              <button
                onClick={handleClaimSeat}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:border-indigo-300"
              >
                Xin vào làm người chơi
              </button>
            )}
            {side && room.status === "PLAYING" && (
              <button
                onClick={handleResign}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
              >
                Xin thua
              </button>
            )}
            {side && hasFinished && (
              <button
                onClick={handleReset}
                disabled={!canReset}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-40"
              >
                {canReset ? "Bắt đầu ván mới" : "Chờ cả hai xác nhận"}
              </button>
            )}
            {!side && !seatAvailable && (
              <p className="text-xs text-gray-500 text-center">Bạn đang xem với tư cách khán giả.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-h-[420px] overflow-auto">
            <p className="text-sm font-semibold text-gray-700 mb-3">Lịch sử nước đi</p>
            <MoveHistory moves={room.moves ?? []} />
          </div>
        </div>
      </div>
    </section>
  );
}
