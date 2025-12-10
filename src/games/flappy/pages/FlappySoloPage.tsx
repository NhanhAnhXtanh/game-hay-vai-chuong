import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FlappyViewport from "../components/FlappyViewport";
import { useFlappyEngine } from "../logic/flappyEngine";
import { FLAPPY_HOME_PATH } from "../constants";

export default function FlappySoloPage() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const [round, setRound] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [best, setBest] = useState(0);

  const engine = useFlappyEngine({
    seed,
    round,
    running: playing,
    onSnapshot: snap => {
      if (!snap.alive && snap.started) {
        setBest(prev => Math.max(prev, snap.score));
        setPlaying(false);
      }
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!playing) startRun();
        engine.flap();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [engine, playing]);

  function startRun() {
    const nextSeed = Math.floor(Math.random() * 1_000_000_000);
    setSeed(nextSeed);
    setRound(r => r + 1);
    setPlaying(true);
    engine.start();
  }

  const status = useMemo(() => {
    if (!engine.view.started) return "Bam de bat dau";
    if (engine.view.alive) return "Dang bay";
    return "Game over";
  }, [engine.view.alive, engine.view.started]);

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-indigo-600 font-semibold">Solo mode</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Flappy tap</h1>
          <p className="text-sm text-gray-600">An Space hoac cham vao man de dap canh. Diem cao nhat se luu trong luc choi.</p>
        </div>
        <Link
          to={FLAPPY_HOME_PATH}
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-200"
        >
          Ve lobby
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] items-start">
        <div className="rounded-2xl border bg-white/90 p-3 md:p-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!playing) startRun();
              engine.flap();
            }}
            onKeyDown={() => {}}
            className="cursor-pointer select-none"
          >
            <FlappyViewport state={engine.view} highlight />
          </div>
        </div>
        <div className="rounded-2xl border bg-white/90 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Trang thai</p>
              <p className="text-xl font-semibold text-gray-900">{status}</p>
            </div>
            <button
              onClick={startRun}
              className="inline-flex items-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-500 transition"
            >
              Choi lai
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-xs text-indigo-700 uppercase tracking-widest font-semibold">Diem moi</p>
              <p className="text-2xl font-bold text-indigo-900">{engine.view.score}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs text-slate-700 uppercase tracking-widest font-semibold">Diem cao nhat</p>
              <p className="text-2xl font-bold text-slate-900">{best}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Khi mat song, man hinh se dung lai, bam nut <span className="font-semibold">Choi lai</span> hoac Space de bat dau van moi.
          </p>
        </div>
      </div>
    </section>
  );
}
