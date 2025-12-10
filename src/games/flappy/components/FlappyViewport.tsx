import {
  BIRD_SIZE,
  BIRD_X,
  GROUND_HEIGHT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type RenderState
} from "../logic/flappyEngine";

interface FlappyViewportProps {
  state?: RenderState | null;
  highlight?: boolean;
  label?: string;
  muted?: boolean;
}

function formatLabel(label?: string) {
  if (!label) return null;
  return (
    <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 text-gray-800 border border-gray-200">
      {label}
    </div>
  );
}

export default function FlappyViewport({ state, highlight, label, muted }: FlappyViewportProps) {
  const data: RenderState = state ?? {
    birdY: WORLD_HEIGHT / 2,
    velocity: 0,
    pipes: [],
    score: 0,
    alive: true,
    started: false,
    round: 0,
    updatedAt: Date.now()
  };
  const alive = data.alive && data.started;
  const statusText = !data.started ? "Ready" : alive ? "Flying" : "Out";

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border ${
        highlight ? "border-indigo-300 shadow-lg shadow-indigo-100" : "border-gray-200 shadow-sm"
      } ${muted ? "grayscale-[0.3] opacity-80" : ""}`}
      style={{ background: "linear-gradient(160deg, #e0f2fe 0%, #e7e9fb 50%, #f4f2ff 100%)" }}
    >
      {formatLabel(label)}
      <svg viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
          <linearGradient id="pipe-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="bird-body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#sky)" />

        {/* Pipes */}
        {data.pipes.map(pipe => {
          const gapTop = pipe.gapY - 85;
          return (
            <g key={pipe.id}>
              <rect x={pipe.x} y={0} width={72} height={gapTop} fill="url(#pipe-body)" rx={6} />
              <rect
                x={pipe.x - 3}
                y={gapTop - 18}
                width={78}
                height={18}
                rx={4}
                fill="#16a34a"
                stroke="#15803d"
                strokeWidth={2}
              />
              <rect
                x={pipe.x}
                y={pipe.gapY + 85}
                width={72}
                height={WORLD_HEIGHT - (pipe.gapY + 85) - GROUND_HEIGHT}
                fill="url(#pipe-body)"
                rx={6}
              />
              <rect
                x={pipe.x - 3}
                y={pipe.gapY + 85}
                width={78}
                height={18}
                rx={4}
                fill="#16a34a"
                stroke="#15803d"
                strokeWidth={2}
              />
            </g>
          );
        })}

        {/* Bird */}
        <g transform={`translate(${BIRD_X}, ${data.birdY})`}>
          <circle r={BIRD_SIZE / 2} fill="url(#bird-body)" stroke="#d97706" strokeWidth={3} />
          <circle cx={8} cy={-6} r={5} fill="#fff" />
          <circle cx={9} cy={-6} r={2} fill="#0f172a" />
          <polygon points="6,4 20,0 6,-4" fill="#fb923c" />
        </g>

        {/* Ground */}
        <rect
          x={0}
          y={WORLD_HEIGHT - GROUND_HEIGHT}
          width={WORLD_WIDTH}
          height={GROUND_HEIGHT}
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        <line
          x1={0}
          x2={WORLD_WIDTH}
          y1={WORLD_HEIGHT - GROUND_HEIGHT}
          y2={WORLD_HEIGHT - GROUND_HEIGHT}
          stroke="#cbd5e1"
        />
      </svg>

      <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 text-gray-800 border border-gray-200">
        {statusText} • Score {data.score}
      </div>
      {!alive && data.started && (
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] text-white flex items-center justify-center text-lg font-semibold tracking-wide">
          Out
        </div>
      )}
    </div>
  );
}
