import { useCallback, useEffect, useRef, useState } from "react";

export const WORLD_WIDTH = 360;
export const WORLD_HEIGHT = 640;
export const BIRD_X = 80;
export const BIRD_SIZE = 32;
export const GROUND_HEIGHT = 88;
const PIPE_WIDTH = 72;
const PIPE_GAP = 170;
const PIPE_SPACING = 250;
const SCROLL_SPEED = 190; // px per second
const GRAVITY = 1800; // px / s^2
const FLAP_VELOCITY = -520; // px / s

export interface PipeSnapshot {
  id: number;
  x: number;
  gapY: number;
  passed?: boolean;
}

export interface RenderState {
  birdY: number;
  velocity: number;
  pipes: PipeSnapshot[];
  score: number;
  alive: boolean;
  started: boolean;
  round: number;
  updatedAt: number;
}

type MutableState = RenderState & { pipeId: number };

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function makeRng(seed: number) {
  let t = seed + 1;
  return () => {
    t |= 0;
    t = t + 0x6D2B79F5 | 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

function newPipe(seedRng: () => number, id: number, x: number): PipeSnapshot {
  const margin = 120;
  const space = WORLD_HEIGHT - GROUND_HEIGHT - margin * 2 - PIPE_GAP;
  const gapY = margin + seedRng() * space;
  return { id, x, gapY, passed: false };
}

function initialState(seed: number, round: number): MutableState {
  const rng = makeRng(seed ^ (round * 10007));
  const pipes: PipeSnapshot[] = [];
  const startX = WORLD_WIDTH + 140;
  for (let i = 0; i < 3; i += 1) {
    const offset = startX + i * (PIPE_SPACING + PIPE_WIDTH);
    pipes.push(newPipe(rng, i + 1, offset));
  }
  return {
    birdY: WORLD_HEIGHT / 2,
    velocity: 0,
    pipes,
    score: 0,
    alive: true,
    started: false,
    round,
    updatedAt: Date.now(),
    pipeId: pipes[pipes.length - 1]?.id ?? 1
  };
}

function stepState(current: MutableState, dt: number, rng: () => number): MutableState {
  if (!current.started || !current.alive) {
    return { ...current, updatedAt: Date.now() };
  }

  const next: MutableState = { ...current, pipes: current.pipes.map(p => ({ ...p })) };

  next.velocity += GRAVITY * dt;
  next.birdY += next.velocity * dt;

  const scroll = SCROLL_SPEED * dt;
  next.pipes.forEach(pipe => {
    pipe.x -= scroll;
    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
      pipe.passed = true;
      next.score += 1;
    }
  });

  next.pipes = next.pipes.filter(p => p.x > -PIPE_WIDTH - 30);

  const lastPipe = next.pipes[next.pipes.length - 1];
  if (!lastPipe || lastPipe.x < WORLD_WIDTH - PIPE_SPACING) {
    const newId = next.pipeId + 1;
    const newX = lastPipe ? lastPipe.x + PIPE_SPACING + PIPE_WIDTH : WORLD_WIDTH + PIPE_SPACING;
    next.pipes.push(newPipe(rng, newId, newX));
    next.pipeId = newId;
  }

  const birdTop = next.birdY - BIRD_SIZE / 2;
  const birdBottom = next.birdY + BIRD_SIZE / 2;

  if (birdBottom >= WORLD_HEIGHT - GROUND_HEIGHT || birdTop <= 0) {
    next.alive = false;
  }

  for (const pipe of next.pipes) {
    const withinX = BIRD_X + BIRD_SIZE / 2 > pipe.x && BIRD_X - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH;
    if (!withinX) continue;
    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;
    if (birdTop < gapTop || birdBottom > gapBottom) {
      next.alive = false;
      break;
    }
  }

  next.birdY = clamp(next.birdY, 0, WORLD_HEIGHT - GROUND_HEIGHT - 1);
  next.updatedAt = Date.now();
  return next;
}

export interface UseFlappyEngineOptions {
  seed: number;
  round: number;
  running: boolean;
  snapshotIntervalMs?: number;
  onSnapshot?: (snapshot: RenderState) => void;
}

export function useFlappyEngine({
  seed,
  round,
  running,
  onSnapshot,
  snapshotIntervalMs = 120
}: UseFlappyEngineOptions) {
  const [view, setView] = useState<RenderState>(() => initialState(seed, round));
  const stateRef = useRef<MutableState>(initialState(seed, round));
  const rngRef = useRef<() => number>(makeRng(seed ^ (round * 10007)));
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);
  const lastRenderRef = useRef<number>(0);

  useEffect(() => {
    const next = initialState(seed, round);
    stateRef.current = next;
    rngRef.current = makeRng(seed ^ (round * 10007));
    setView(next);
  }, [seed, round]);

  const start = useCallback(() => {
    const next = initialState(seed, round);
    next.started = true;
    stateRef.current = next;
    rngRef.current = makeRng(seed ^ (round * 10007));
    setView(next);
  }, [seed, round]);

  const flap = useCallback(() => {
    const current = stateRef.current;
    if (!current.alive) return;
    const next = { ...current, velocity: FLAP_VELOCITY, started: true, updatedAt: Date.now() };
    stateRef.current = next;
    setView(next);
  }, []);

  const loop = useCallback((timestamp: number) => {
    const last = lastFrameRef.current ?? timestamp;
    const dt = clamp((timestamp - last) / 1000, 0, 0.04);
    lastFrameRef.current = timestamp;

    if (running) {
      const stepped = stepState(stateRef.current, dt, rngRef.current);
      stateRef.current = stepped;

      const shouldEmit = onSnapshot && (timestamp - lastEmitRef.current >= snapshotIntervalMs);
      const shouldRender = timestamp - lastRenderRef.current >= 32;

      if (shouldRender) {
        setView(stepped);
        lastRenderRef.current = timestamp;
      }
      if (shouldEmit) {
        lastEmitRef.current = timestamp;
        onSnapshot({
          birdY: stepped.birdY,
          velocity: stepped.velocity,
          pipes: stepped.pipes.slice(0, 4),
          score: stepped.score,
          alive: stepped.alive,
          started: stepped.started,
          round: stepped.round,
          updatedAt: stepped.updatedAt
        });
      }
    }

    frameRef.current = requestAnimationFrame(loop);
  }, [running, onSnapshot, snapshotIntervalMs]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [loop]);

  return {
    view,
    start,
    flap,
    reset: () => {
      const next = initialState(seed, round);
      stateRef.current = next;
      rngRef.current = makeRng(seed ^ (round * 10007));
      setView(next);
    }
  };
}
