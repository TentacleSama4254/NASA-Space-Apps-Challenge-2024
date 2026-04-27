import type { AsteroidCatalogKind, CloseApproach, SmallBodyOrbit } from './smallBodies';
import { hasUsableOrbit, toFiniteNumber } from './smallBodies';

interface AsteroidCatalogResponse {
  data?: SmallBodyOrbit[];
}

interface CloseApproachResponse {
  data?: CloseApproach[];
}

interface JplArrayResponse {
  fields?: string[];
  data?: unknown[][];
}

const DEFAULT_LIMITS: Record<AsteroidCatalogKind, number> = {
  'main-belt': 20_000,
  neo: 8_000,
  pha: 2_500,
};

const SBDB_QUERY_URL = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api';
const CAD_URL = 'https://ssd-api.jpl.nasa.gov/cad.api';

function apiUrl(path: string, params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });
  return `${path}?${searchParams.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchAsteroidCatalog(
  kind: AsteroidCatalogKind,
  limit = DEFAULT_LIMITS[kind],
): Promise<SmallBodyOrbit[]> {
  try {
    const payload = await fetchJson<AsteroidCatalogResponse>(
      apiUrl('/api/asteroids', { kind, limit }),
    );
    const data = payload.data ?? [];
    if (data.length > 0) return data.filter(hasUsableOrbit);
  } catch (error) {
    console.warn(`[asteroids] Backend catalog unavailable for ${kind}; trying direct SBDB fetch.`, error);
  }

  try {
    const payload = await fetchJson<JplArrayResponse>(buildDirectSbdbUrl(kind, limit));
    const data = rowsToObjects(payload.fields ?? [], payload.data ?? [])
      .map(normalizeJplSmallBody)
      .filter((body): body is SmallBodyOrbit => Boolean(body))
      .filter(hasUsableOrbit);
    if (data.length > 0) return data;
  } catch (error) {
    console.warn(`[asteroids] Direct SBDB fetch unavailable for ${kind}; using static fallback.`, error);
  }

  return loadStaticAsteroids(kind, limit);
}

export async function fetchCloseApproaches(
  days = 365,
  distMaxAu = 0.08,
): Promise<CloseApproach[]> {
  try {
    const payload = await fetchJson<CloseApproachResponse>(
      apiUrl('/api/close-approaches', { days, distMaxAu }),
    );
    return payload.data ?? [];
  } catch (error) {
    console.warn('[asteroids] Backend close-approach feed unavailable; trying direct CAD fetch.', error);
  }

  try {
    const payload = await fetchJson<JplArrayResponse>(buildDirectCadUrl(days, distMaxAu));
    return rowsToObjects(payload.fields ?? [], payload.data ?? [])
      .map(normalizeJplCloseApproach)
      .filter((approach): approach is CloseApproach => Boolean(approach));
  } catch (error) {
    console.warn('[asteroids] Close-approach feed unavailable; continuing without CAD tags.', error);
    return [];
  }
}

function buildDirectSbdbUrl(kind: AsteroidCatalogKind, limit: number): string {
  const params = new URLSearchParams({
    fields: [
      'spkid',
      'full_name',
      'pdes',
      'name',
      'kind',
      'class',
      'neo',
      'pha',
      'epoch',
      'e',
      'a',
      'q',
      'i',
      'om',
      'w',
      'ma',
      'per',
      'H',
      'diameter',
    ].join(','),
    'full-prec': 'true',
    limit: String(limit),
    sort: kind === 'main-belt' ? 'a' : 'moid',
    'sb-kind': 'a',
  });

  if (kind === 'main-belt') params.set('sb-class', 'IMB,MBA,OMB');
  else params.set('sb-group', kind);

  return `${SBDB_QUERY_URL}?${params.toString()}`;
}

function buildDirectCadUrl(days: number, distMaxAu: number): string {
  const params = new URLSearchParams({
    'date-min': 'now',
    'date-max': `+${days}`,
    'dist-max': String(distMaxAu),
    body: 'Earth',
    sort: 'dist',
    diameter: 'true',
    fullname: 'true',
    limit: '300',
  });
  return `${CAD_URL}?${params.toString()}`;
}

async function loadStaticAsteroids(
  kind: AsteroidCatalogKind,
  limit: number,
): Promise<SmallBodyOrbit[]> {
  const module = await import('../assets/asteroid_api_data');
  const rows = Array.isArray(module.AsteroidData) ? module.AsteroidData : [];
  const bodies: SmallBodyOrbit[] = [];

  for (const row of rows) {
    if (bodies.length >= limit) break;
    const body = normalizeStaticRow(row);
    if (!body || !hasUsableOrbit(body)) continue;
    if (!matchesKind(body, kind)) continue;
    bodies.push(body);
  }

  return bodies;
}

function matchesKind(body: SmallBodyOrbit, kind: AsteroidCatalogKind): boolean {
  if (kind === 'neo') return body.neo;
  if (kind === 'pha') return body.pha;
  return ['IMB', 'MBA', 'OMB'].includes(body.orbitClass ?? '');
}

function rowsToObjects(fields: string[], rows: unknown[][]): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const object: Record<string, unknown> = {};
    fields.forEach((field, index) => {
      object[field] = row[index];
    });
    return object;
  });
}

function normalizeJplSmallBody(row: Record<string, unknown>): SmallBodyOrbit | null {
  const body = normalizeStaticRow({ ...row, source: 'sbdb' });
  if (!body) return null;
  return {
    ...body,
    kind: String(row.kind ?? '').startsWith('c') ? 'comet' : 'asteroid',
    source: 'sbdb',
  };
}

const AU_PER_LUNAR_DISTANCE = 384_400 / 149_597_870.7;

function normalizeJplCloseApproach(row: Record<string, unknown>): CloseApproach | null {
  const designation = String(row.des ?? '').trim();
  const distanceAu = toFiniteNumber(row.dist);
  const relativeVelocityKmS = toFiniteNumber(row.v_rel);
  const jd = toFiniteNumber(row.jd);
  if (!designation || distanceAu === undefined || relativeVelocityKmS === undefined || jd === undefined) {
    return null;
  }

  return {
    designation,
    orbitId: row.orbit_id === undefined ? undefined : String(row.orbit_id),
    jd,
    date: String(row.cd ?? ''),
    distanceAu,
    distanceMinAu: toFiniteNumber(row.dist_min),
    distanceMaxAu: toFiniteNumber(row.dist_max),
    distanceLd: distanceAu / AU_PER_LUNAR_DISTANCE,
    relativeVelocityKmS,
    vInfKmS: toFiniteNumber(row.v_inf),
    timeUncertainty: row.t_sigma_f === undefined ? undefined : String(row.t_sigma_f),
    h: toFiniteNumber(row.h),
    diameterKm: toFiniteNumber(row.diameter),
    fullName: row.fullname === undefined ? undefined : String(row.fullname).trim(),
    source: 'cad',
  };
}

function normalizeStaticRow(row: Record<string, unknown>): SmallBodyOrbit | null {
  const a = toFiniteNumber(row.a);
  const e = toFiniteNumber(row.e);
  const i = toFiniteNumber(row.i);
  const om = toFiniteNumber(row.om);
  const w = toFiniteNumber(row.w);
  const ma = toFiniteNumber(row.ma);
  const epoch = toFiniteNumber(row.epoch);
  const per = toFiniteNumber(row.per);
  if (
    a === undefined ||
    e === undefined ||
    i === undefined ||
    om === undefined ||
    w === undefined ||
    ma === undefined ||
    epoch === undefined ||
    per === undefined
  ) {
    return null;
  }

  const designation = String(row.pdes ?? row.full_name ?? row.name ?? '').trim();
  if (!designation) return null;

  return {
    designation,
    name: String(row.name ?? row.full_name ?? designation).trim(),
    spkid: row.spkid === undefined ? undefined : String(row.spkid),
    kind: 'asteroid',
    orbitClass: row.class === undefined ? undefined : String(row.class),
    a,
    e,
    i,
    om,
    w,
    ma,
    epoch,
    per,
    diameterKm: toFiniteNumber(row.diameter),
    h: toFiniteNumber(row.H),
    neo: isTruthyFlag(row.neo),
    pha: isTruthyFlag(row.pha),
    source: row.source === 'sbdb' ? 'sbdb' : 'static',
  };
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 'Y' || value === 'true' || value === '1';
}
