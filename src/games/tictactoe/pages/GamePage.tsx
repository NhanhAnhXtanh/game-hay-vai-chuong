import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ensureAnon } from "../../shared/firebase";
import {
  listenRoom, listenMessages, joinRoom, leaveRoom, placeMove,
  startRound, setReady, offerDraw, respondDraw, surrender, sendMessage,
  type Room, type ChatMessage
} from "../services/roomService";
import { TIC_TAC_TOE_HOME_PATH, TIC_TAC_TOE_INVITE_PATH } from "../constants";
import { decodeInviteToken, encodeInviteToken } from "../services/inviteLink";
import GameBoard from "../components/GameBoard";
import Loading from "../../../components/Loading";

export default function GamePage() {
  const params = useParams<{ roomId?: string; inviteId?: string }>();
  const { roomId, inviteId } = params;
  const [sp] = useSearchParams();
  const legacyPw = sp.get("pw") || undefined;

  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null);
  const [resolvedPassword, setResolvedPassword] = useState<string | undefined>(undefined);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const nav = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(() => {
    const saved = localStorage.getItem("player-name");
    return saved && saved.trim().length ? saved.trim() : null;
  });
  const [nameDraft, setNameDraft] = useState(() => displayName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winActionsEnabled, setWinActionsEnabled] = useState(false);
  const [winCountdown, setWinCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const mySide = useMemo<"X" | "O" | null>(() => {
    if (!room || !myUid) return null;
    if (room.players?.X?.uid === myUid) return "X";
    if (room.players?.O?.uid === myUid) return "O";
    return null;
  }, [room, myUid]);

  useEffect(() => {
    // Ưu tiên invite token mới, fallback về roomId + legacy pw (hỗ trợ link cũ)
    if (inviteId) {
      (async () => {
        try {
          const decoded = await decodeInviteToken(inviteId);
          if (!decoded) {
            console.error("Failed to decode token:", inviteId);
            setResolveError("Link phòng không hợp lệ hoặc đã bị hỏng.");
            setResolvedRoomId(null);
            setResolvedPassword(undefined);
          } else {
            setResolveError(null);
            setResolvedRoomId(decoded.roomId);
            setResolvedPassword(decoded.password);
          }
        } catch (error) {
          console.error("Token decode exception:", error);
          setResolveError("Link phòng không hợp lệ hoặc đã bị hỏng.");
          setResolvedRoomId(null);
          setResolvedPassword(undefined);
        }
      })();
    } else if (roomId) {
      setResolveError(null);
      setResolvedRoomId(roomId);
      setResolvedPassword(legacyPw || undefined);
    } else {
      setResolveError("Thiếu thông tin phòng.");
      setResolvedRoomId(null);
      setResolvedPassword(undefined);
    }
  }, [inviteId, roomId, legacyPw]);

  useEffect(() => {
    if (!displayName || !resolvedRoomId) return;
    let off: (() => void) | null = null;
    (async () => {
      const me = await ensureAnon(displayName);
      setMyUid(me.uid);
      const effectiveName = (me.displayName && me.displayName.trim()) || displayName;
      if (effectiveName !== displayName) {
        setDisplayName(effectiveName);
        localStorage.setItem("player-name", effectiveName);
        return; // wait for next effect run with updated name
      }
      localStorage.setItem("player-name", effectiveName);
      try {
        await joinRoom(resolvedRoomId, me.uid, effectiveName, resolvedPassword);
        setJoinError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không thể tham gia phòng.";
        setJoinError(msg);
      }
      off = listenRoom(resolvedRoomId, setRoom);
    })();
    return () => { if (off) off(); };
  }, [resolvedRoomId, resolvedPassword, displayName]);

  useEffect(() => {
    if (!resolvedRoomId) return;
    setMessages([]);
    const off = listenMessages(resolvedRoomId, setMessages, 50);
    return () => off();
  }, [resolvedRoomId]);

  async function onMove(r: number, c: number) {
    if (!room || !mySide) return;
    if (room.status !== "PLAYING") return;
    if (!resolvedRoomId) return;
    await placeMove(resolvedRoomId, mySide, r, c);
  }

  async function onReadyClick() {
    if (!mySide || !room) return;
    const currentReady = room.players?.[mySide]?.ready ?? false;
    if (!resolvedRoomId) return;
    await setReady(resolvedRoomId, mySide, !currentReady);
  }

  async function onRematchVote(ready: boolean) {
    if (!mySide || !room) return;
    if (!resolvedRoomId) return;
    await setReady(resolvedRoomId, mySide, ready);
  }

  async function onOfferDrawClick() {
    if (!mySide || !room) return;
    if (!resolvedRoomId) return;
    await offerDraw(resolvedRoomId, mySide);
  }

  async function onRespondDrawClick(accept: boolean) {
    if (!mySide || !room) return;
    if (!resolvedRoomId) return;
    await respondDraw(resolvedRoomId, mySide, accept);
  }

  async function onSurrenderClick() {
    if (!mySide || !room) return;
    setShowSurrenderConfirm(true);
  }

  async function onLeave() {
    if (room?.status === "PLAYING" && mySide) {
      setShowLeaveConfirm(true);
      return;
    }
    if (mySide && resolvedRoomId) await leaveRoom(resolvedRoomId, mySide);
    nav(TIC_TAC_TOE_HOME_PATH);
  }

  const bothReady = !!room?.players?.X?.ready && !!room?.players?.O?.ready;

  useEffect(() => {
    if (!room || !mySide || !resolvedRoomId) return;
    if ((room.status === "LOBBY" || room.status === "ROUND_END") && bothReady) {
      startRound(resolvedRoomId);
    }
  }, [room, bothReady, resolvedRoomId, mySide]);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let enableTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    if (room?.status === "ROUND_END") {
      showTimer = setTimeout(() => {
        setShowWinModal(true);
        setWinActionsEnabled(false);
        setWinCountdown(3);
        countdownInterval = setInterval(() => {
          setWinCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        enableTimer = setTimeout(() => {
          setWinActionsEnabled(true);
          setWinCountdown(0);
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
        }, 3000);
      }, 1000);
    } else {
      setShowWinModal(false);
      setWinActionsEnabled(false);
      setWinCountdown(0);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (enableTimer) clearTimeout(enableTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [room?.status]);

  useEffect(() => {
    if (room?.status !== "PLAYING") {
      setShowSurrenderConfirm(false);
      setShowLeaveConfirm(false);
    }
  }, [room?.status]);

  async function onCopyRoomId() {
    if (!resolvedRoomId) return;
    try {
      const origin = window.location.origin;
      const token = await encodeInviteToken(resolvedRoomId, resolvedPassword);
      const link = `${origin}${TIC_TAC_TOE_INVITE_PATH}/${token}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      setCopied(false);
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (displayName) setNameDraft(displayName);
  }, [displayName]);
  useEffect(() => {
    if (!mySide) return;
    const current = room?.players?.[mySide]?.name?.trim();
    if (current && current !== displayName) {
      setDisplayName(current);
      localStorage.setItem("player-name", current);
    }
  }, [room?.players, mySide, displayName]);

  const myDisplayName = useMemo(() => {
    if (mySide && room?.players?.[mySide]?.name) return room.players[mySide]!.name;
    return displayName ?? "Player";
  }, [room?.players, mySide, displayName]);

  useEffect(() => {
    if (!chatListRef.current) return;
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [messages]);
  const canChat = !!mySide;
  const showNameOverlay = displayName === null;

  const handleNameSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError("Vui lòng nhập tên của bạn.");
      return;
    }
    setNameError(null);
    setJoinError(null);
    setDisplayName(trimmed);
    localStorage.setItem("player-name", trimmed);
  }, [nameDraft]);

  if (showNameOverlay) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-900">
              Tham gia phòng
            </h1>
            <p className="text-sm sm:text-base text-slate-600 text-center leading-relaxed">
              Vui lòng nhập tên hiển thị trước khi vào phòng.
            </p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-medium text-slate-700 block">
                Tên của bạn
              </label>
              <input
                className="w-full rounded-lg sm:rounded-xl border-2 border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                placeholder="Nhập tên của bạn"
                autoFocus
              />
              {nameError && (
                <div className="text-xs sm:text-sm text-red-600 mt-1.5 font-medium">
                  {nameError}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-semibold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vào phòng
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (resolveError) {
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
              {resolveError || "Link phòng không hợp lệ hoặc đã bị hỏng. Vui lòng kiểm tra lại link hoặc yêu cầu người tạo phòng gửi link mới."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-semibold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
              onClick={() => nav(TIC_TAC_TOE_HOME_PATH)}
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

  if (!room || !resolvedRoomId) {
    return <Loading message="Đang tải phòng..." />;
  }
  const playerX = room.players?.X ?? null;
  const playerO = room.players?.O ?? null;
  const winningLine = room.winningLine ?? null;
  const winnerName = room.winner === "X" ? playerX?.name : room.winner === "O" ? playerO?.name : null;
  const myReady = mySide ? room.players?.[mySide]?.ready ?? false : false;
  const drawOfferFrom = room.drawOffer?.from ?? null;
  const drawOfferedByMe = !!mySide && drawOfferFrom === mySide;
  const drawPendingForMe = !!mySide && drawOfferFrom !== null && drawOfferFrom !== mySide;
  const drawPending = drawOfferFrom !== null;
  const resultType = room.endedBy?.type ?? (room.winner ? "WIN" : null);
  const resultBy = room.endedBy?.by ?? null;
  const surrenderedName =
    resultType === "SURRENDER"
      ? (resultBy === "X" ? (playerX?.name || "Người chơi X") :
        resultBy === "O" ? (playerO?.name || "Người chơi O") : "Người chơi")
      : null;
  const resultMessage = (() => {
    if (resultType === "DRAW") return "Ván đấu kết thúc với kết quả hoà.";
    if (resultType === "SURRENDER") {
      const winnerLabel = winnerName ?? (room.winner ? `Người chơi ${room.winner}` : "Đối thủ");
      return `${winnerLabel} thắng (đối phương đầu hàng).`;
    }
    if (winnerName) return `${winnerName} thắng (${room.winner}).`;
    if (room.winner) return `Người thắng: ${room.winner}.`;
    return "Ván đấu kết thúc.";
  })();

  async function onChatSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolvedRoomId || !myUid) return;
    const text = chatDraft.trim();
    if (!text) return;
    try {
      await sendMessage(resolvedRoomId, {
        uid: myUid,
        name: myDisplayName,
        text
      });
      setChatDraft("");
    } catch (_) {
      // ignore errors for now
    }
  }

  return (
    <>
      {showWinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4 text-center">
            <h2 className="text-xl font-semibold">Ván đấu kết thúc</h2>
            <div className="text-lg font-medium">{resultMessage}</div>
            {resultType === "SURRENDER" && surrenderedName && (
              <div className="text-sm text-slate-600">Người đầu hàng: {surrenderedName}</div>
            )}
            {!winActionsEnabled ? (
              <div className="text-sm text-slate-600">
                Tuỳ chọn sẽ xuất hiện sau {winCountdown}s
              </div>
            ) : (
              <div className="space-y-4">
                {mySide ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-center gap-3">
                      <button
                        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onRematchVote(true)}
                        disabled={!mySide || !winActionsEnabled || myReady}
                      >
                        {myReady ? "Đã sẵn sàng" : "Chơi tiếp"}
                      </button>
                      <button
                        className="px-4 py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onRematchVote(false)}
                        disabled={!mySide || !winActionsEnabled || !myReady}
                      >
                        Huỷ sẵn sàng
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">Đang chờ người chơi quyết định…</div>
                )}
                <div className="text-xs text-left text-slate-500 space-y-1">
                  <div>
                    • X: {playerX?.name || "Trống"} — {playerX?.ready ? "đã đồng ý" : "chưa đồng ý"}
                  </div>
                  <div>
                    • O: {playerO?.name || "Trống"} — {playerO?.ready ? "đã đồng ý" : "chưa đồng ý"}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    className="mt-2 px-3 py-2 rounded border hover:bg-slate-100"
                    onClick={onLeave}
                  >
                    Rời phòng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-bold break-all">Phòng {resolvedRoomId}</h1>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button
              className="px-3 py-2 rounded border hover:bg-slate-100 text-sm sm:text-base"
              onClick={onCopyRoomId}
            >
              {copied ? "Đã sao chép!" : "Copy link"}
            </button>
            <button
              className="px-3 py-2 rounded border border-red-400 text-red-600 hover:bg-red-50 text-sm sm:text-base"
              onClick={onLeave}
            >
              Rời phòng
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border p-3 sm:p-4 md:p-5 bg-white">
            <GameBoard
              board={room.board}
              onMove={onMove}
              lastMove={room.lastMove}
              winningLine={winningLine ?? undefined}
            />
          </div>

          <div className="space-y-4 md:space-y-5">
            <div className="rounded-xl border p-3 sm:p-4 bg-white">
              <h3 className="font-semibold mb-2">Người chơi</h3>
              <div className="p-3 rounded mb-3 bg-blue-50">
                <div className="flex justify-between">
                  <span>X: {playerX?.name || "Trống"}</span>
                  <span>Score: {playerX?.score ?? 0}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {playerX
                    ? (playerX.ready ? "Đã sẵn sàng" : "Chưa sẵn sàng")
                    : "Chưa có người"}
                </div>
              </div>
              <div className="p-3 rounded bg-red-50">
                <div className="flex justify-between">
                  <span>O: {playerO?.name || "Trống"}</span>
                  <span>Score: {playerO?.score ?? 0}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {playerO
                    ? (playerO.ready ? "Đã sẵn sàng" : "Chưa sẵn sàng")
                    : "Chưa có người"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-3 sm:p-4 bg-white space-y-3">
              {room.status === "LOBBY" && (
                <>
                  <div>Trạng thái: Phòng chờ</div>
                  {joinError && (
                    <div className="text-sm text-red-600">{joinError}</div>
                  )}
                  {!joinError && !mySide && (
                    <div className="text-sm text-gray-600">Phòng đã đủ người, bạn đang xem.</div>
                  )}
                  <button
                    className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onReadyClick}
                    disabled={!mySide}
                  >
                    {myReady ? "Huỷ sẵn sàng" : "Sẵn sàng"}
                  </button>
                </>
              )}

              {room.status === "PLAYING" && (
                <div className="space-y-3">
                  <div>Đang chơi. Lượt: {room.turn === "X" ? playerX?.name : playerO?.name}</div>
                  <div className="text-sm text-slate-600">
                    {mySide ? (room.turn === mySide ? "Đến lượt bạn." : "Chờ đối phương.") : "Bạn đang xem."}
                  </div>
                  {mySide ? (
                    <div className="space-y-3 pt-1">
                      {!showSurrenderConfirm && !showLeaveConfirm && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="px-3 py-2 rounded border bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={onOfferDrawClick}
                            disabled={drawPending}
                          >
                            Xin hoà
                          </button>
                          <button
                            className="px-3 py-2 rounded border border-red-400 text-red-600 hover:bg-red-50"
                            onClick={onSurrenderClick}
                          >
                            Đầu hàng
                          </button>
                          <button
                            className="px-4 py-2 rounded border hover:bg-slate-100"
                            onClick={onLeave}
                          >
                            Rời phòng
                          </button>
                        </div>
                      )}

                      {showSurrenderConfirm && (
                        <div className="p-3 rounded-lg border border-red-200 bg-red-50 space-y-2">
                          <div className="text-sm text-red-800 font-medium">Bạn có chắc chắn muốn đầu hàng?</div>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                              onClick={async () => {
                                if (resolvedRoomId && mySide) {
                                  await surrender(resolvedRoomId, mySide);
                                  setShowSurrenderConfirm(false);
                                }
                              }}
                            >
                              Đồng ý
                            </button>
                            <button
                              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50"
                              onClick={() => setShowSurrenderConfirm(false)}
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )}

                      {showLeaveConfirm && (
                        <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 space-y-2">
                          <div className="text-sm text-orange-800 font-medium">
                            Rời phòng sẽ huỷ trận đấu. Bạn chắc chứ?
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
                              onClick={async () => {
                                if (mySide && resolvedRoomId) {
                                  await leaveRoom(resolvedRoomId, mySide);
                                  nav(TIC_TAC_TOE_HOME_PATH);
                                }
                              }}
                            >
                              Đồng ý
                            </button>
                            <button
                              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50"
                              onClick={() => setShowLeaveConfirm(false)}
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )}

                      {drawOfferedByMe && (
                        <div className="text-sm text-blue-600">Bạn đã đề nghị hoà. Đang chờ đối thủ phản hồi…</div>
                      )}
                      {drawPendingForMe && (
                        <div className="space-y-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                          <div className="text-sm text-emerald-800 font-medium">
                            {drawOfferFrom === "X" ? (playerX?.name || "Người chơi X") : (playerO?.name || "Người chơi O")} muốn hoà.
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
                              onClick={() => onRespondDrawClick(true)}
                            >
                              Đồng ý
                            </button>
                            <button
                              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50"
                              onClick={() => onRespondDrawClick(false)}
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-slate-500">Người xem không thể thao tác.</div>
                      {drawPending && (
                        <div className="text-sm text-slate-600 italic">
                          Đang có lời đề nghị hoà chờ xử lý.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {room.status === "ROUND_END" && (
                <div className="space-y-3">
                  <div>{resultMessage}</div>
                  {resultType === "SURRENDER" && surrenderedName && (
                    <div className="text-sm text-slate-600">
                      Người đầu hàng: {surrenderedName}.
                    </div>
                  )}
                  <div className="text-sm text-slate-600">
                    Chờ cả hai chọn "Chơi tiếp" để bắt đầu ván mới.
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>• X: {playerX?.ready ? "đã sẵn sàng" : "chưa sẵn sàng"}</div>
                    <div>• O: {playerO?.ready ? "đã sẵn sàng" : "chưa sẵn sàng"}</div>
                  </div>
                  <button className="px-4 py-2 rounded border" onClick={onLeave}>Rời phòng</button>
                </div>
              )}
            </div>

            <div className="rounded-xl border p-3 sm:p-4 bg-white flex flex-col h-[52vh] min-h-[18rem] max-h-[24rem] md:h-[26rem] xl:h-[28rem]">
              <h3 className="font-semibold mb-2">Trò chuyện</h3>
              <div
                ref={chatListRef}
                className="flex-1 overflow-y-auto space-y-3 pr-1"
              >
                {messages.length === 0 && (
                  <div className="text-sm text-slate-500">Chưa có tin nhắn.</div>
                )}
                {messages.map(msg => {
                  const isMine = myUid === msg.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm shadow-sm ${isMine
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                      >
                        <div className="text-xs font-semibold opacity-80 mb-1">
                          {isMine ? "Bạn" : msg.name || "Người chơi"}
                        </div>
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={onChatSubmit} className="pt-3 flex gap-2">
                <input
                  className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={canChat ? "Nhập tin nhắn..." : "Chỉ người trong phòng mới chat"}
                  value={chatDraft}
                  onChange={e => setChatDraft(e.target.value)}
                  disabled={!canChat}
                />
                <button
                  type="submit"
                  className="flex-shrink-0 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canChat || !chatDraft.trim()}
                >
                  Gửi
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
