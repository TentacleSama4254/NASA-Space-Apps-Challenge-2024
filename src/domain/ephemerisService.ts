/**
 * Ephemeris Service
 *
 * Loads pre-generated JPL Horizons state-vector tables from
 * /public/ephemeris/<bodyId>.json and interpolates them to give
 * scene-space positions at any simulated calendar time.
 *
 * Coordinate transform from Horizons ecliptic J2000 (Z-up, X = vernal
 * equinox) to three.js Y-up right-handed:
 *   scene X =  ecliptic X / scale
 *   scene Y =  ecliptic Z / scale   (north ecliptic pole → up)
 *   scene Z = -ecliptic Y / scale
 *
 * This matches the -90° X-axis rotation applied at the end of propagate().
 */

import * as THREE from 'three';
import type { EphemerisSeries, StateVector } from './types';
import { BODIES, PRELOAD_BODY_IDS } from './bodyRegistry';
import { DISTANCE_SCALE_KM, SUN_OFFSET } from '../config/constants';

// ─── Internal cache ──────────────────────────────────────────────────────────

const seriesCache = new Map<string, EphemerisSeries>();
const loadingSet = new Set<string>();
const listeners = new Set<(bodyId: string) => void>();

interface PreloadOptions {
  deferRest?: boolean;
  delayMs?: number;
  staggerMs?: number;
}

function requestIdle(callback: () => void, timeout: number): void {
  const idleCallback = window.requestIdleCallback;
  if (idleCallback) {
    idleCallback(callback, { timeout });
    return;
  }

  window.setTimeout(callback, timeout);
}

function emitLoaded(bodyId: string): void {
  listeners.forEach((listener) => listener(bodyId));
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/** Convert ecliptic J2000 km coords to three.js scene units (Y-up). */
function eclipticToScene(km: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(
    km[0] / DISTANCE_SCALE_KM,
     km[2] / DISTANCE_SCALE_KM,   // ecliptic Z (north) → scene Y (up)
    -km[1] / DISTANCE_SCALE_KM,   // ecliptic Y (east)  → scene -Z
  );
}

// ─── Interpolation ────────────────────────────────────────────────────────────

/**
 * Binary-search linear interpolation within a sorted StateVector array.
 * Clamps to the first/last record if simTimeMs is outside the data range.
 */
function interpolate(
  records: StateVector[],
  simTimeMs: number,
): [number, number, number] | null {
  if (records.length === 0) return null;
  if (simTimeMs <= records[0].unixMs) return records[0].posKm;
  if (simTimeMs >= records[records.length - 1].unixMs)
    return records[records.length - 1].posKm;

  let lo = 0;
  let hi = records.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (records[mid].unixMs <= simTimeMs) lo = mid;
    else hi = mid;
  }

  const r0 = records[lo];
  const r1 = records[hi];
  const t = (simTimeMs - r0.unixMs) / (r1.unixMs - r0.unixMs);

  return [
    r0.posKm[0] + t * (r1.posKm[0] - r0.posKm[0]),
    r0.posKm[1] + t * (r1.posKm[1] - r0.posKm[1]),
    r0.posKm[2] + t * (r1.posKm[2] - r0.posKm[2]),
  ];
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function loadBody(bodyId: string): void {
  if (seriesCache.has(bodyId) || loadingSet.has(bodyId)) return;
  loadingSet.add(bodyId);

  fetch(`/ephemeris/${bodyId}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<EphemerisSeries>;
    })
    .then((series) => {
      seriesCache.set(bodyId, series);
      emitLoaded(bodyId);
      console.info(
        `[ephemeris] Loaded ${series.records.length} records for ${bodyId}` +
          ` (source: ${series.generatedAt})`,
      );
    })
    .catch((err) => {
      // Not fatal – the app falls back to Keplerian propagation.
      console.warn(
        `[ephemeris] Data not available for "${bodyId}" – using Keplerian fallback. ` +
          `Run "npm run fetch-ephemeris" to generate the data files. (${err.message})`,
      );
    });
}

/** Kick off ephemeris loading with optional deferred background bodies. */
export function preloadEphemeris(
  priorityIds: readonly string[] = PRELOAD_BODY_IDS,
  options: PreloadOptions = {},
): void {
  priorityIds.forEach(loadBody);

  if (!options.deferRest) {
    PRELOAD_BODY_IDS.filter((bodyId) => !priorityIds.includes(bodyId)).forEach(loadBody);
    return;
  }

  const delayMs = options.delayMs ?? 1200;
  const staggerMs = options.staggerMs ?? 450;

  PRELOAD_BODY_IDS
    .filter((bodyId) => !priorityIds.includes(bodyId))
    .forEach((bodyId, index) => {
      window.setTimeout(() => {
        requestIdle(() => loadBody(bodyId), 1200);
      }, delayMs + index * staggerMs);
    });
}

/** Load one body's ephemeris on demand, such as when a planet becomes focused. */
export function loadEphemerisForBody(bodyId: string): void {
  loadBody(bodyId);
}

/** Subscribe to loaded-body events so orbit geometry can rebuild after data arrives. */
export function subscribeEphemerisLoaded(listener: (bodyId: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Returns true once the ephemeris series for bodyId is in memory. */
export function isBodyLoaded(bodyId: string): boolean {
  return seriesCache.has(bodyId);
}

// ─── Public position API ──────────────────────────────────────────────────────

/**
 * Returns the absolute scene-space position for a body at simTimeMs, or null
 * when the ephemeris data has not been loaded yet.
 *
 * - Heliocentric planets: position in scene units from origin, shifted by SUN_OFFSET.
 * - Moons: computed as parent body's absolute scene position + planetocentric offset.
 */
export function getBodyPosition(
  bodyId: string,
  simTimeMs: number,
): THREE.Vector3 | null {
  const series = seriesCache.get(bodyId);
  if (!series) return null;

  const posKm = interpolate(series.records, simTimeMs);
  if (!posKm) return null;

  const sceneOffset = eclipticToScene(posKm);

  const body = BODIES[bodyId];
  if (body?.type === 'moon' && body.parentId) {
    const parentPos = getBodyPosition(body.parentId, simTimeMs);
    if (!parentPos) return null;
    return parentPos.clone().add(sceneOffset);
  }

  // All heliocentric bodies: add SUN_OFFSET so the Sun sits at SUN_OFFSET.
  return sceneOffset.add(SUN_OFFSET.clone());
}

/**
 * Returns an ordered array of scene-space positions spanning approximately one
 * full orbit around simTimeMs, suitable for drawing an orbit path.
 *
 * Falls back to null if ephemeris data is not loaded.
 * The caller can then sample the Keplerian propagate() function instead.
 */
export function getOrbitPath(
  bodyId: string,
  simTimeMs: number,
  samples = 1440,
): THREE.Vector3[] | null {
  const series = seriesCache.get(bodyId);
  if (!series || series.records.length < 3) return null;

  const body = BODIES[bodyId];
  const periodMs = (body?.periodDays ?? 365) * 86400 * 1000;
  const half = periodMs / 2;
  const startMs = simTimeMs - half;
  const endMs = simTimeMs + half;
  const firstRecordMs = series.records[0].unixMs;
  const lastRecordMs = series.records[series.records.length - 1].unixMs;

  if (startMs < firstRecordMs || endMs > lastRecordMs) {
    return null;
  }

  const points: THREE.Vector3[] = [];

  // Sample uniformly from the same interpolated position provider the bodies use.
  // This guarantees the current simTime point is on the rendered orbit instead
  // of merely near a daily Horizons sample.
  for (let i = 0; i <= samples; i += 1) {
    const t = startMs + (i / samples) * periodMs;
    const point = getBodyPosition(bodyId, t);
    if (point) points.push(point);
  }

  return points.length >= 3 ? points : null;
}
