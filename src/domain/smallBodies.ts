import { DISTANCE_SCALE_KM } from '../config/constants';

export type AsteroidCatalogKind = 'neo' | 'pha' | 'main-belt';

export interface SmallBodyOrbit {
  designation: string;
  name: string;
  spkid?: string;
  kind: 'asteroid' | 'comet';
  orbitClass?: string;
  a: number;
  e: number;
  i: number;
  om: number;
  w: number;
  ma: number;
  epoch: number;
  per: number;
  diameterKm?: number;
  h?: number;
  rotationPeriodHours?: number;
  pole?: string;
  neo: boolean;
  pha: boolean;
  source: 'sbdb' | 'static';
}

export interface CloseApproach {
  designation: string;
  orbitId?: string;
  jd: number;
  date: string;
  distanceAu: number;
  distanceMinAu?: number;
  distanceMaxAu?: number;
  distanceLd: number;
  relativeVelocityKmS: number;
  vInfKmS?: number;
  timeUncertainty?: string;
  h?: number;
  diameterKm?: number;
  fullName?: string;
  source: 'cad';
}

export interface SatelliteTleRecord {
  name: string;
  noradId?: number;
  group: 'active' | 'leo' | 'meo' | 'geo' | 'heo' | 'starlink' | 'stations';
  line1: string;
  line2: string;
  epoch?: string;
  altitudeBand?: 'LEO' | 'MEO' | 'GEO' | 'HEO';
}

export interface MissionTrajectory {
  id: string;
  name: string;
  horizonsId: number;
  launchDate?: string;
  modelPath?: string;
  trajectoryPath?: string;
}

const AU_KM = 149_597_870.7;
const JD_UNIX_EPOCH = 2_440_587.5;
const TWO_PI = Math.PI * 2;

export function jdToUnixMs(jd: number): number {
  return (jd - JD_UNIX_EPOCH) * 86_400_000;
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

export function hasUsableOrbit(body: SmallBodyOrbit): boolean {
  return (
    Number.isFinite(body.a) &&
    body.a > 0 &&
    Number.isFinite(body.e) &&
    body.e >= 0 &&
    body.e < 1 &&
    Number.isFinite(body.i) &&
    Number.isFinite(body.om) &&
    Number.isFinite(body.w) &&
    Number.isFinite(body.ma) &&
    Number.isFinite(body.epoch) &&
    Number.isFinite(body.per) &&
    body.per > 0
  );
}

function solveKepler(e: number, meanAnomaly: number): number {
  let eccentricAnomaly = meanAnomaly;
  for (let index = 0; index < 8; index += 1) {
    const delta =
      (eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - e * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return eccentricAnomaly;
}

export function writeSmallBodyPosition(
  body: SmallBodyOrbit,
  simTimeMs: number,
  target: Float32Array,
  offset: number,
): void {
  const aScene = (body.a * AU_KM) / DISTANCE_SCALE_KM;
  const periodSec = body.per * 86_400;
  const secFromEpoch = (simTimeMs - jdToUnixMs(body.epoch)) / 1000;
  const meanAnomaly =
    ((body.ma * Math.PI) / 180 + (TWO_PI * secFromEpoch) / periodSec) % TWO_PI;
  const normalizedMeanAnomaly = ((meanAnomaly % TWO_PI) + TWO_PI) % TWO_PI;
  const eccentricAnomaly = solveKepler(body.e, normalizedMeanAnomaly);

  const cosE = Math.cos(eccentricAnomaly);
  const sinE = Math.sin(eccentricAnomaly);
  const perifocalX = aScene * (cosE - body.e);
  const perifocalY = aScene * Math.sqrt(1 - body.e * body.e) * sinE;

  const raan = (body.om * Math.PI) / 180;
  const inclination = (body.i * Math.PI) / 180;
  const periapsis = (body.w * Math.PI) / 180;

  const cosO = Math.cos(raan);
  const sinO = Math.sin(raan);
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosW = Math.cos(periapsis);
  const sinW = Math.sin(periapsis);

  const x =
    perifocalX * (cosO * cosW - sinO * sinW * cosI) -
    perifocalY * (cosO * sinW + sinO * cosW * cosI);
  const y =
    perifocalX * (sinO * cosW + cosO * sinW * cosI) +
    perifocalY * (cosO * cosW * cosI - sinO * sinW);
  const z =
    perifocalX * (sinW * sinI) +
    perifocalY * (cosW * sinI);

  // Match the app's existing ecliptic Z-up to three.js Y-up convention.
  target[offset] = x;
  target[offset + 1] = z;
  target[offset + 2] = -y;
}
