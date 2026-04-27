/**
 * SimulationClock
 *
 * Provides a shared simulation time (Unix ms) that drives planet positions.
 * Starting at real wall-clock time, the simulation advances at a configurable
 * time scale so orbits are visible without waiting years.
 *
 * The hot path (getSimTimeMs) uses a ref so it never triggers React re-renders.
 * UI components that need a reactive date string should read getSimTimeMs() in
 * their own useFrame loop and maintain local state.
 *
 * Default timeScale 12_000 ≈ 3.3 simulated hours per real second. Faster
 * speeds are available in the HUD, but this keeps fast moons visually smooth.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimClockContextType {
  /** Read the current simulation time (Unix ms). Safe to call in useFrame. */
  getSimTimeMs: () => number;
  /** Jump to a specific simulation time. */
  setSimTimeMs: (ms: number) => void;
  /** Milliseconds of sim time per real millisecond. */
  timeScale: number;
  setTimeScale: (s: number) => void;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  /** Reset sim time to the current wall-clock time. */
  jumpToNow: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const SimClockContext = createContext<SimClockContextType | null>(null);

/**
 * Hook to consume the simulation clock.
 * Returns null when called outside the provider (components can fall back
 * to Date.now() in that case).
 */
export const useSimClock = (): SimClockContextType | null =>
  useContext(SimClockContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

const DEFAULT_SCALE = 12_000; // ~3.3 sim-hours per real second

interface Props {
  children: ReactNode;
}

export const SimulationClockProvider = ({ children }: Props) => {
  // Refs for the hot path (mutated in useFrame, never causes re-renders).
  const simTimeRef   = useRef<number>(Date.now());
  const timeScaleRef = useRef<number>(DEFAULT_SCALE);
  const isPlayingRef = useRef<boolean>(true);

  // React state only for the toolbar / UI (low-frequency reads).
  const [timeScale, setTimeScaleState] = useState<number>(DEFAULT_SCALE);
  const [isPlaying, setIsPlayingState] = useState<boolean>(true);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;

      if (isPlayingRef.current) {
        simTimeRef.current += delta * 1000 * timeScaleRef.current;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const getSimTimeMs = useCallback(() => simTimeRef.current, []);

  const setSimTimeMs = useCallback((ms: number) => {
    simTimeRef.current = ms;
  }, []);

  const setTimeScale = useCallback((s: number) => {
    timeScaleRef.current = s;
    setTimeScaleState(s);
  }, []);

  const play = useCallback(() => {
    isPlayingRef.current = true;
    setIsPlayingState(true);
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlayingState(false);
  }, []);

  const jumpToNow = useCallback(() => {
    simTimeRef.current = Date.now();
  }, []);

  return (
    <SimClockContext.Provider
      value={{
        getSimTimeMs,
        setSimTimeMs,
        timeScale,
        setTimeScale,
        isPlaying,
        play,
        pause,
        jumpToNow,
      }}
    >
      {children}
    </SimClockContext.Provider>
  );
};
