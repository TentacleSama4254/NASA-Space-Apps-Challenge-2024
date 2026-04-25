/**
 * Expansion Data Adapters — Scaffold
 *
 * This file documents the data source, query approach, coordinate handling,
 * and integration point for each planned expansion layer.  Stub functions
 * and interfaces are provided so future implementations have a clear starting
 * point without breaking the existing build.
 *
 * Integration roadmap:
 *   Phase A — Major planetary moons (Io, Europa, Titan, Triton, etc.)
 *   Phase B — Asteroids & comets  (JPL SBDB + Horizons)
 *   Phase C — Space missions       (JPL Horizons spacecraft IDs)
 *   Phase D — Low-Earth satellites (TLE / SGP4)
 *   Phase E — Meteor showers       (radiant streams / ZHR envelopes)
 */

import type { BodyDefinition, EphemerisSeries, StateVector } from './types';

// ─── Phase A: Major planetary moons ──────────────────────────────────────────

/**
 * JPL NAIF IDs for the major moons to visualise in Phase A.
 *
 * Horizons query:
 *   COMMAND='<naifId>'
 *   CENTER='<parentPlanetNaif>@<parentPlanetNaif>'  (planet-centred frame)
 *   EPHEM_TYPE=VECTORS
 *
 * Example: Io relative to Jupiter
 *   COMMAND='501'   CENTER='500@599'
 *
 * Add the generated JSON as public/ephemeris/<moonId>.json using the
 * same scripts/fetchEphemeris.mjs pattern.  Step size: 6h for inner
 * moons (Io 1.8-day period), 1d for outer moons (Titan 16-day period).
 */
export const PLANNED_MOONS: Record<
  string,
  { naifId: number; parentId: string; parentNaif: number }
> = {
  io:       { naifId: 501, parentId: 'jupiter', parentNaif: 599 },
  europa:   { naifId: 502, parentId: 'jupiter', parentNaif: 599 },
  ganymede: { naifId: 503, parentId: 'jupiter', parentNaif: 599 },
  callisto: { naifId: 504, parentId: 'jupiter', parentNaif: 599 },
  titan:    { naifId: 606, parentId: 'saturn',  parentNaif: 699 },
  enceladus:{ naifId: 602, parentId: 'saturn',  parentNaif: 699 },
  triton:   { naifId: 801, parentId: 'neptune', parentNaif: 899 },
  miranda:  { naifId: 705, parentId: 'uranus',  parentNaif: 799 },
};

/** Stub — returns null until Phase A data files exist. */
export function getMoonEphemerisUrl(moonId: string): string {
  return `/ephemeris/${moonId}.json`;
}

// ─── Phase B: Asteroids and comets ───────────────────────────────────────────

/**
 * For large catalogs: use the SBDB Query API to fetch orbital elements in bulk.
 *   GET https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=pdes,name,a,e,i,om,w,ma,per,epoch&neo=Y&limit=500
 *
 * For featured bodies (e.g. an active comet during close approach): use Horizons
 * VECTORS with a short time window centred on the encounter for high accuracy.
 *
 * The existing AsteroidData asset covers the bulk catalog;
 * Scene.tsx already parses it with real orbital elements (Phase 4).
 * Phase B adds:
 *   - Comet class bodies (e ≥ 1 hyperbolic, or e near 1 for long-period)
 *   - Interactive object browser (click → show SBDB data card)
 *   - Visible asteroid-belt density map (10 000+ objects using instanced mesh)
 */
export interface SBDBQueryRecord {
  pdes: string;        // primary designation, e.g. "433"
  name?: string;
  a: number;           // AU
  e: number;
  i: number;           // degrees
  om: number;          // degrees
  w: number;           // degrees
  ma: number;          // degrees
  per: number;         // days
  epoch: number;       // Julian date
}

/** Stub — call SBDB Query API and return normalized records. */
export async function fetchSBDBOrbits(
  _params: { neo?: boolean; pha?: boolean; limit?: number },
): Promise<SBDBQueryRecord[]> {
  // TODO Phase B: implement
  // const url = `https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=pdes,name,a,e,i,om,w,ma,per,epoch&limit=${limit}`;
  return [];
}

// ─── Phase C: Space missions ──────────────────────────────────────────────────

/**
 * JPL Horizons supports spacecraft trajectories via their NAIF IDs.
 * The data is often only available for a specific mission window.
 *
 * Example missions and their Horizons command IDs:
 *   Voyager 1: -31
 *   Voyager 2: -32
 *   New Horizons: -98
 *   James Webb: -170
 *   Perseverance: -168
 *   Parker Solar Probe: -96
 *
 * Query:
 *   COMMAND='-31'   CENTER='500@10'   EPHEM_TYPE=VECTORS   STEP_SIZE='1d'
 *
 * For "live" updates: fetch a rolling 30-day window every hour.
 * For historical archive: use the fetch script with a wide date range.
 */
export const PLANNED_MISSIONS: Record<string, { naifId: number; launchDate: string; active: boolean }> = {
  voyager1:       { naifId: -31,  launchDate: '1977-09-05', active: true },
  voyager2:       { naifId: -32,  launchDate: '1977-08-20', active: true },
  newHorizons:    { naifId: -98,  launchDate: '2006-01-19', active: true },
  jamesWebb:      { naifId: -170, launchDate: '2021-12-25', active: true },
  parkerSolar:    { naifId: -96,  launchDate: '2018-08-12', active: true },
};

/** Stub — fetch a mission's trajectory from Horizons or cache. */
export async function fetchMissionTrajectory(
  _naifId: number,
  _startDate: string,
  _stopDate: string,
): Promise<EphemerisSeries | null> {
  // TODO Phase C: implement using buildHorizonsUrl from nasaApi.ts
  return null;
}

// ─── Phase D: Low-Earth satellites (TLE / SGP4) ───────────────────────────────

/**
 * TLE data comes from sources like Celestrak or Space-Track.org, not JPL.
 * Propagation uses the SGP4 algorithm (not Keplerian or Horizons).
 *
 * Suggested library: satellite.js (npm) — provides sgp4() and twoline2satrec().
 *
 * Data sources:
 *   Celestrak active satellites: https://celestrak.org/SOCRATES/query.php
 *   ISS TLE: https://celestrak.org/satcat/tle.php?CATNR=25544
 *   Starlink: https://celestrak.org/SOCRATES/query.php
 *
 * Coordinate note: SGP4 returns ECI (Earth-Centred Inertial) km.
 * Convert to scene space:
 *   1. Add Earth's ephemeris position (from ephemerisService)
 *   2. Apply same eclipticToScene() transform
 */
export interface TLERecord {
  name: string;
  line1: string;
  line2: string;
}

/** Stub — fetch TLE file and parse into records. */
export async function fetchTLEs(_url: string): Promise<TLERecord[]> {
  // TODO Phase D: fetch Celestrak URL, split lines into 3-line groups
  return [];
}

// ─── Phase E: Meteor showers ──────────────────────────────────────────────────

/**
 * Meteor showers are best represented as stream zones along the parent
 * comet's orbit, with visual intensity varying by date (ZHR envelope).
 *
 * Data source: International Meteor Organization (IMO) calendar.
 *   https://www.imo.net/resources/calendar/
 *
 * Representation in-scene:
 *   - Draw the parent comet's orbit (or an approximation)
 *   - Add a semi-transparent tube along the orbit within ±activity_window
 *   - Animate radiant particles outward from the radiant point
 *
 * No live API needed — annual meteor shower parameters are static.
 */
export interface MeteorShower {
  name: string;
  /** Parent comet/asteroid designation */
  parent: string;
  /** Sky radiant (RA/Dec degrees at peak) */
  radiantRa: number;
  radiantDec: number;
  /** Approximate peak date (MM-DD) */
  peakDate: string;
  /** Peak zenithal hourly rate */
  peakZHR: number;
}

export const METEOR_SHOWERS: MeteorShower[] = [
  { name: 'Perseids',   parent: '109P/Swift-Tuttle',  radiantRa: 48,  radiantDec: 58,  peakDate: '08-12', peakZHR: 100 },
  { name: 'Leonids',    parent: '55P/Tempel-Tuttle',  radiantRa: 153, radiantDec: 22,  peakDate: '11-17', peakZHR:  15 },
  { name: 'Geminids',   parent: '3200 Phaethon',      radiantRa: 112, radiantDec: 33,  peakDate: '12-14', peakZHR: 120 },
  { name: 'Quadrantids',parent: '2003 EH1',           radiantRa: 230, radiantDec: 49,  peakDate: '01-03', peakZHR: 110 },
  { name: 'Eta Aquarids',parent:'1P/Halley',          radiantRa:  338,radiantDec: -1,  peakDate: '05-06', peakZHR:  50 },
];
