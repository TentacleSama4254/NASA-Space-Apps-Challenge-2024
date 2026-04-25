/**
 * NASA JPL Horizons API client.
 *
 * Provides helpers for building Horizons vector-ephemeris queries and for
 * parsing the plain-text $$SOE / $$EOE response format.
 *
 * The fetch script (scripts/fetchEphemeris.mjs) uses the Node.js version of
 * this logic to pre-generate /public/ephemeris/*.json files so the browser
 * never hits the API directly (avoids CORS and rate-limit issues).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EphemerisRecord {
  /** Barycentric Dynamical Time Julian Date */
  tdbJd: number;
  /** Same instant as Unix milliseconds */
  unixMs: number;
  /** Calendar string from the Horizons header line */
  calendarDate: string;
  position: { x: number; y: number; z: number };
  velocity: { vx: number; vy: number; vz: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/** Julian date epoch for Unix time 0 (1970-01-01 00:00:00 UTC) */
const JD_UNIX_EPOCH = 2440587.5;

export function jdToUnixMs(jd: number): number {
  return (jd - JD_UNIX_EPOCH) * 86400000;
}

// ─── Query builder ────────────────────────────────────────────────────────────

export interface HorizonsQueryParams {
  /** NAIF integer id, e.g. 399 for Earth, 301 for Moon */
  command: number;
  /** Center body id string, e.g. "10" for Sun, "399" for Earth */
  /** e.g. "500@10" for Sun-centered, "500@399" for Earth-centered */
  center?: string;
  start: string;     // ISO date, e.g. "2024-01-01"
  stop: string;      // ISO date, e.g. "2027-12-31"
  stepSize?: string; // e.g. "1d", "6h"
}

/** Construct a Horizons VECTORS query URL. */
export function buildHorizonsUrl(params: HorizonsQueryParams): string {
  const {
    command,
    center = '500@10',
    start,
    stop,
    stepSize = '1d',
  } = params;

  const qs = [
    `format=text`,
    `COMMAND='${command}'`,
    `CENTER='${center}'`,
    `EPHEM_TYPE=VECTORS`,
    `START_TIME='${start}'`,
    `STOP_TIME='${stop}'`,
    `STEP_SIZE='${stepSize}'`,
    `OUT_UNITS='KM-S'`,
  ].join('&');

  return `${HORIZONS_BASE}?${qs}`;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse the plain-text Horizons VECTORS response.
 *
 * Each record block is 5 lines inside $$SOE / $$EOE markers:
 *   Line 0: "<JD> = <calendar date> TDB"
 *   Line 1: "X = <km>   Y = <km>   Z = <km>"
 *   Line 2: "VX= <km/s>  VY= <km/s>  VZ= <km/s>"
 *   Line 3: "LT= <s>  RG= <km>  RR= <km/s>"
 *   Line 4: (blank)
 */
export function parseHorizons(text: string): EphemerisRecord[] {
  const lines = text.split(/\r?\n/);
  const soe = lines.indexOf('$$SOE');
  const eoe = lines.indexOf('$$EOE');
  if (soe === -1 || eoe === -1) return [];

  const records: EphemerisRecord[] = [];

  for (let i = soe + 1; i < eoe; i += 4) {
    const l0 = lines[i]?.trim();
    const l1 = lines[i + 1]?.trim();
    const l2 = lines[i + 2]?.trim();
    if (!l0 || !l1 || !l2) continue;

    // Parse Julian date (everything before the first "=")
    const jdMatch = /^([\d.]+)\s*=/.exec(l0);
    const tdbJd = jdMatch ? parseFloat(jdMatch[1]) : NaN;
    const calendarDate = l0.split('=')[1]?.trim() ?? '';

    const x = parseFloat(/X\s*=\s*([-\d.E+]+)/i.exec(l1)?.[1] ?? 'NaN');
    const y = parseFloat(/Y\s*=\s*([-\d.E+]+)/i.exec(l1)?.[1] ?? 'NaN');
    const z = parseFloat(/Z\s*=\s*([-\d.E+]+)/i.exec(l1)?.[1] ?? 'NaN');

    const vx = parseFloat(/VX\s*=\s*([-\d.E+]+)/i.exec(l2)?.[1] ?? 'NaN');
    const vy = parseFloat(/VY\s*=\s*([-\d.E+]+)/i.exec(l2)?.[1] ?? 'NaN');
    const vz = parseFloat(/VZ\s*=\s*([-\d.E+]+)/i.exec(l2)?.[1] ?? 'NaN');

    if ([tdbJd, x, y, z, vx, vy, vz].some(isNaN)) continue;

    records.push({
      tdbJd,
      unixMs: jdToUnixMs(tdbJd),
      calendarDate,
      position: { x, y, z },
      velocity: { vx, vy, vz },
    });
  }

  return records;
}

// ─── Browser fetch helper (runtime use) ──────────────────────────────────────

/**
 * Fetch ephemeris data from JPL Horizons at runtime.
 * NOTE: Prefer the pre-generated JSON files in /public/ephemeris/ via the
 * ephemerisService instead.  This function is provided as a fallback for
 * live queries (e.g. spacecraft or newly-discovered objects) and may be
 * blocked by the browser's CORS policy unless the server adds the appropriate
 * headers.
 */
export async function fetchEphemeris(
  params: HorizonsQueryParams,
): Promise<EphemerisRecord[]> {
  const url = buildHorizonsUrl(params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons request failed: ${res.status}`);
  return parseHorizons(await res.text());
}
