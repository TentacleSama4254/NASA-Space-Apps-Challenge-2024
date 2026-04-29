/** Type of solar system body */
export type BodyType = 'star' | 'planet' | 'moon' | 'asteroid' | 'comet' | 'spacecraft' | 'satellite';

/** Texture paths for progressive loading */
export interface TextureTier {
  /** CSS color used as an instant placeholder before any HTTP request */
  placeholder: string;
  /** Low-resolution texture path (shown first; 1k–2k) */
  low: string;
  /** High-resolution texture path (loaded when close or focused; 4k–8k) */
  high: string;
}

/** Optional renderable 3D asset for irregular bodies. */
export interface ModelAsset {
  /** Public asset path, loaded only when the body is inspected closely */
  path: string;
  /** Human-readable source/credit for asset audits and attribution */
  credit?: string;
}

/** Physical axial rotation model. Negative periods are retrograde. */
export interface BodyRotation {
  /** Sidereal rotation period in hours */
  periodHours: number;
  /** Obliquity/axial tilt in degrees */
  axialTiltDeg: number;
  /** Texture prime-meridian phase offset at J2000, if known/calibrated */
  phaseDeg?: number;
}

/** Complete physical and visual definition of a solar system body */
export interface BodyDefinition {
  /** App-internal identifier (lowercase, e.g. "earth", "moon") */
  id: string;
  /** JPL NAIF numeric id used in Horizons queries (e.g. 399 for Earth) */
  horizonsId: number;
  name: string;
  type: BodyType;
  /** Parent body id; null = heliocentric (Sun as origin) */
  parentId: string | null;
  /** Physical mean radius in km */
  radiusKm: number;
  /** Hex color for the label dot (replaces runtime extractColors) */
  labelColor: string;
  textures: TextureTier;
  model?: ModelAsset;
  rotation?: BodyRotation;
  /** Keplerian fallback elements used when ephemeris data is unavailable */
  keplerianElements?: KeplerianElements;
  /** Orbital period in Earth days (used for fallback propagation) */
  periodDays?: number;
}

/** Orbital elements expressed in scene-space units and degrees.
 *  Semi-major axis is in scene units (km / DISTANCE_SCALE_KM).
 *  Angles are in degrees, matching the existing propagate() convention. */
export interface KeplerianElements {
  /** Semi-major axis in scene units */
  a: number;
  /** Eccentricity */
  e: number;
  /** Inclination in degrees */
  inclination: number;
  /** Argument of periapsis in degrees */
  omega: number;
  /** Right ascension of ascending node in degrees */
  raan: number;
  /** Mean anomaly at J2000 epoch in degrees (improves positional accuracy) */
  ma0?: number;
}

/** Single sampled state vector from JPL Horizons VECTORS ephemeris */
export interface StateVector {
  /** Barycentric Dynamical Time as Julian date */
  tdbJd: number;
  /** Same epoch expressed as Unix milliseconds for JS convenience */
  unixMs: number;
  /** Position in km relative to the query center (ecliptic J2000 frame) */
  posKm: [number, number, number];
  /** Velocity in km/s */
  velKmS: [number, number, number];
}

/** Full ephemeris series for one body, stored in public/ephemeris/<id>.json */
export interface EphemerisSeries {
  bodyId: string;
  horizonsId: number;
  /** Horizons CENTER parameter used, e.g. "10" = Sun */
  centerId: string;
  /** Reference frame, e.g. "ECLIPJ2000" */
  frame: string;
  /** ISO timestamp when this file was generated */
  generatedAt: string;
  /** The Horizons query URL that produced this data */
  sourceUrl: string;
  records: StateVector[];
}
