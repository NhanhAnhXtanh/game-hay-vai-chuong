import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
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
import Loading from "../../../components/Loading";

const NAME_KEY = "chess-player-name";

const STATUS_STYLES: Record<ChessRoom["status"], { label: string; className: string }> = {
  LOBBY: { label: "Waiting", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  PLAYING: { label: "Playing", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  CHECKMATE: { label: "Checkmate", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  DRAW: { label: "Draw", className: "bg-slate-50 text-slate-700 border border-slate-200" },
  STALEMATE: { label: "Draw (stalemate)", className: "bg-slate-50 text-slate-700 border border-slate-200" },
  RESIGN: { label: "Resigned", className: "bg-rose-50 text-rose-700 border border-rose-200" }
};

export default function ChessGamePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const initialName = typeof window !== "undefined" ? (localStorage.getItem(NAME_KEY)?.trim() ?? "") : "";
  const [playerName, setPlayerName] = useState(initialName);
  const [needsName, setNeedsName] = useState(() => !initialName);
  const [copied, setCopied] = useState(false);
  const [room, setRoom] = useState<ChessRoom | null>(null);
  const [side, setSide] = useState<ChessSide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

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
    return () => {
      unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || needsName) return;
    const normalizedName = playerName.trim() || localStorage.getItem(NAME_KEY)?.trim() || "Chess guest";

    const join = async () => {
      try {
        localStorage.setItem(NAME_KEY, normalizedName);
        setPlayerName(normalizedName);
        const user = await ensureChessAnon(normalizedName);
        const seat = await joinChessRoom(roomId, user.uid, normalizedName);
        setSide(seat);
        joinedRef.current = true;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to join, you are viewing as a spectator.");
      }
    };
    join();

    return () => {
      if (joinedRef.current && chessAuth.currentUser) {
        leaveChessRoom(roomId, chessAuth.currentUser.uid).catch(() => {});
        joinedRef.current = false;
      }
    };
  }, [roomId, needsName, playerName]);

  const lastMove = room?.moves?.[room.moves.length - 1];
  const myUid = chessAuth.currentUser?.uid;
  const isPlaying = room?.status === "PLAYING";
  const isMyTurn = Boolean(room && side && isPlaying && room.turn === side);
  const scores = room?.scores ?? {};

  async function handleMove(from: Square, to: Square, promotion?: PieceSymbol | null) {
    if (!roomId || !myUid) return;
    try {
      await makeChessMove(roomId, { from, to, promotion, uid: myUid });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to play that move.");
    }
  }

  async function handleClaimSeat() {
    if (!roomId) return;
    try {
      const normalizedName = playerName.trim() || localStorage.getItem(NAME_KEY) || "Chess guest";
      localStorage.setItem(NAME_KEY, normalizedName);
      setPlayerName(normalizedName);
      const user = await ensureChessAnon(normalizedName);
      const seat = await joinChessRoom(roomId, user.uid, normalizedName);
      setSide(seat);
      joinedRef.current = true;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sit down right now.");
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

  function handleCopyLink() {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard errors */
    }
  }

  function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    if (!playerName.trim()) return;
    setNeedsName(false);
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
        text = "Waiting for two players.";
        break;
      case "PLAYING":
        text = room.turn === "white" ? "White to move" : "Black to move";
        break;
      case "CHECKMATE":
        text = room.winner ? `${room.winner === "white" ? "White" : "Black"} wins by checkmate.` : "Checkmate.";
        break;
      case "RESIGN":
        text = room.winner ? `${room.winner === "white" ? "White" : "Black"} wins (opponent resigned).` : "Game finished.";
        break;
      case "DRAW":
        text = "Game drawn.";
        break;
      case "STALEMATE":
        text = "Draw due to stalemate.";
        break;
      default:
        text = "";
    }
    if (!side) text = text ? `${text} · You are spectating.` : "You are watching this game.";
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
  const whiteScore = players.white?.uid ? scores[players.white.uid] ?? 0 : 0;
  const blackScore = players.black?.uid ? scores[players.black.uid] ?? 0 : 0;
  const hasFinished = !!(room && room.status !== "PLAYING" && room.status !== "LOBBY");
  const finishedAtMs = hasFinished && room && typeof room.finishedAt === "number" ? room.finishedAt : null;
  const delayActive = Boolean(hasFinished && finishedAtMs && now - finishedAtMs < 5000);
  const countdown = delayActive && finishedAtMs ? Math.ceil((5000 - (now - finishedAtMs)) / 1000) : 0;
  const myAck = side ? room?.finishAck?.[side] : false;
  const bothAck = Boolean(room?.finishAck?.white && room?.finishAck?.black);
  const canReset = Boolean(hasFinished && bothAck);
  const finishMessage = hasFinished
    ? room.winner
      ? `${room.winner === "white" ? "White" : "Black"} wins (${room.status.toLowerCase()}).`
      : room.status === "DRAW"
        ? "The game ended in a draw."
        : "This game has finished."
    : "";
  const seatAvailable = !side && (!players.white || !players.black);
  const statusBadge = room ? STATUS_STYLES[room.status] : null;

  useEffect(() => {
    if (!room || !chessAuth.currentUser) return;
    const uid = chessAuth.currentUser.uid;
    const nextSide =
      room.players?.white?.uid === uid ? "white" :
      room.players?.black?.uid === uid ? "black" :
      null;
    if (nextSide !== side) {
      setSide(nextSide);
    }
  }, [room?.players?.white?.uid, room?.players?.black?.uid, side]);

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md sm:max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 sm:space-y-8 text-center">
          <div className="space-y-3 sm:space-y-4">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              URL không hợp lệ
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
              Thiếu thông tin phòng. Vui lòng kiểm tra lại link hoặc yêu cầu người tạo phòng gửi link mới.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
              onClick={() => navigate(CHESS_HOME_PATH)}
            >
              Quay về trang chủ
            </button>
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border-2 border-slate-300 text-slate-700 text-sm sm:text-base font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading message="Đang tải phòng cờ vua..." />;
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md sm:max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 sm:space-y-8 text-center">
          <div className="space-y-3 sm:space-y-4">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              URL không hợp lệ
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
              Phòng không tồn tại hoặc link đã bị hỏng. Vui lòng kiểm tra lại link hoặc yêu cầu người tạo phòng gửi link mới.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
              onClick={() => navigate(CHESS_HOME_PATH)}
            >
              Quay về trang chủ
            </button>
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border-2 border-slate-300 text-slate-700 text-sm sm:text-base font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsName) {
    return (
      <section className="max-w-2xl mx-auto space-y-6 text-gray-900">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm border border-indigo-100">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-semibold mb-2">Room {room.id}</p>
          <h1 className="text-3xl font-bold mb-2">Enter a name to join</h1>
          <p className="text-sm text-gray-600">Let everyone know who you are before you jump into the room.</p>
        </div>
        <form onSubmit={handleNameSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <label className="space-y-1 block">
            <span className="text-sm font-medium text-gray-700">Display name</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Example: Guest"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!playerName.trim()}
          >
            Join room
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-8 text-gray-900">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-semibold">Room {room.id}</p>
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
              onClick={handleCopyLink}
              className="rounded-xl border border-gray-200 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-200 transition"
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
            <button
              onClick={handleLeave}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-gray-200/60"
            >
              Leave room
            </button>
          </div>
        </div>
        {hasFinished && (
          <div className="rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 space-y-2">
            <p className="text-lg font-semibold text-indigo-900">{finishMessage}</p>
            {delayActive ? (
              <p className="text-sm text-indigo-700">Wait {countdown}s before confirming the rematch…</p>
            ) : (
              side && (
                <button
                  disabled={Boolean(myAck)}
                  onClick={handleAcknowledge}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-60"
                >
                  {myAck ? "Ready" : "I'm ready for the next game"}
                </button>
              )
            )}
            <p className="text-xs text-gray-600">
              {bothAck ? "Both players confirmed. Hit Start new game when ready." : "Waiting for both players to confirm."}
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
              label="Player 1"
              player={players.white}
              side="white"
              score={whiteScore}
              isTurn={room.turn === "white" && room.status === "PLAYING"}
              isMe={players.white?.uid === myUid}
            />
            <PlayerInfoCard
              label="Player 2"
              player={players.black}
              side="black"
              score={blackScore}
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
                Take a seat
              </button>
            )}
            {side && room.status === "PLAYING" && (
              <button
                onClick={handleResign}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
              >
                Resign
              </button>
            )}
            {side && hasFinished && (
              <button
                onClick={handleReset}
                disabled={!canReset}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-40"
              >
                {canReset ? "Start new game" : "Waiting for both players"}
              </button>
            )}
            {!side && !seatAvailable && (
              <p className="text-xs text-gray-500 text-center">Both seats are taken. You are spectating.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-h-[420px] overflow-auto">
            <p className="text-sm font-semibold text-gray-700 mb-3">Move history</p>
            <MoveHistory moves={room.moves ?? []} />
          </div>
        </div>
      </div>
    </section>
  );
}
