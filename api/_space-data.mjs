const SBDB_QUERY_URL = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api';
const CAD_URL = 'https://ssd-api.jpl.nasa.gov/cad.api';
const AU_PER_LUNAR_DISTANCE = 384_400 / 149_597_870.7;

const cache = globalThis.__spaceAppsDataCache ?? new Map();
globalThis.__spaceAppsDataCache = cache;

export function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getQuery(req) {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `https://${host}`);
  return url.searchParams;
}

export function sendJson(res, status, payload, maxAgeSeconds = 3600) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 6}`,
  );
  res.end(JSON.stringify(payload));
}

export async function cachedJson(url, ttlMs) {
  const cached = cache.get(url);
  const now = Date.now();
  if (cached && now - cached.timestamp < ttlMs) return cached.payload;

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Upstream HTTP ${response.status} for ${url}`);
  }
  const payload = await response.json();
  cache.set(url, { timestamp: now, payload });
  return payload;
}

export function buildSbdbUrl({ kind, limit }) {
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

  if (kind === 'neo') {
    params.set('sb-group', 'neo');
  } else if (kind === 'pha') {
    params.set('sb-group', 'pha');
  } else {
    params.set('sb-class', 'IMB,MBA,OMB');
  }

  return `${SBDB_QUERY_URL}?${params.toString()}`;
}

export function buildCadUrl({ days, distMaxAu, limit = 300 }) {
  const params = new URLSearchParams({
    'date-min': 'now',
    'date-max': `+${days}`,
    'dist-max': String(distMaxAu),
    body: 'Earth',
    sort: 'dist',
    diameter: 'true',
    fullname: 'true',
    limit: String(limit),
  });

  return `${CAD_URL}?${params.toString()}`;
}

export function rowsToObjects(fields = [], rows = []) {
  return rows.map((row) => {
    const object = {};
    fields.forEach((field, index) => {
      object[field] = row[index];
    });
    return object;
  });
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

export function normalizeSmallBody(row) {
  const designation = String(row.pdes ?? row.full_name ?? row.name ?? '').trim();
  const a = toNumber(row.a);
  const e = toNumber(row.e);
  const i = toNumber(row.i);
  const om = toNumber(row.om);
  const w = toNumber(row.w);
  const ma = toNumber(row.ma);
  const epoch = toNumber(row.epoch);
  const per = toNumber(row.per);

  if (!designation || !a || e === undefined || i === undefined || om === undefined) {
    return null;
  }
  if (w === undefined || ma === undefined || epoch === undefined || !per || e >= 1) {
    return null;
  }

  return {
    designation,
    name: String(row.name ?? row.full_name ?? designation).trim(),
    spkid: row.spkid === undefined ? undefined : String(row.spkid),
    kind: String(row.kind ?? '').startsWith('c') ? 'comet' : 'asteroid',
    orbitClass: row.class === undefined ? undefined : String(row.class),
    a,
    e,
    i,
    om,
    w,
    ma,
    epoch,
    per,
    diameterKm: toNumber(row.diameter),
    h: toNumber(row.H),
    neo: row.neo === true || row.neo === 'Y',
    pha: row.pha === true || row.pha === 'Y',
    source: 'sbdb',
  };
}

export function normalizeCloseApproach(row) {
  const designation = String(row.des ?? '').trim();
  const distanceAu = toNumber(row.dist);
  const relativeVelocityKmS = toNumber(row.v_rel);
  const jd = toNumber(row.jd);
  if (!designation || distanceAu === undefined || relativeVelocityKmS === undefined || jd === undefined) {
    return null;
  }

  return {
    designation,
    orbitId: row.orbit_id === undefined ? undefined : String(row.orbit_id),
    jd,
    date: String(row.cd ?? ''),
    distanceAu,
    distanceMinAu: toNumber(row.dist_min),
    distanceMaxAu: toNumber(row.dist_max),
    distanceLd: distanceAu / AU_PER_LUNAR_DISTANCE,
    relativeVelocityKmS,
    vInfKmS: toNumber(row.v_inf),
    timeUncertainty: row.t_sigma_f === undefined ? undefined : String(row.t_sigma_f),
    h: toNumber(row.h),
    diameterKm: toNumber(row.diameter),
    fullName: row.fullname === undefined ? undefined : String(row.fullname).trim(),
    source: 'cad',
  };
}

