import {
  clampNumber,
  getQuery,
  sendJson,
} from './_space-data.mjs';

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const GROUPS = {
  active: 'active',
  stations: 'stations',
  starlink: 'starlink',
  geo: 'geo',
  meo: 'gnss',
};
const textCache = globalThis.__spaceAppsTextCache ?? new Map();
globalThis.__spaceAppsTextCache = textCache;

async function cachedText(url, ttlMs) {
  const cached = textCache.get(url);
  const now = Date.now();
  if (cached && now - cached.timestamp < ttlMs) return cached.payload;

  const response = await fetch(url, { headers: { Accept: 'text/plain' } });
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status} for ${url}`);
  const payload = await response.text();
  textCache.set(url, { timestamp: now, payload });
  return payload;
}

function parseTle(text, limit) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const records = [];

  for (let index = 0; index < lines.length - 2 && records.length < limit; index += 3) {
    const name = lines[index].trim();
    const line1 = lines[index + 1]?.trim();
    const line2 = lines[index + 2]?.trim();
    if (!line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;

    const noradId = Number(line1.slice(2, 7));
    records.push({
      name,
      noradId: Number.isFinite(noradId) ? noradId : undefined,
      line1,
      line2,
      epoch: line1.slice(18, 32).trim(),
      source: 'celestrak',
    });
  }

  return records;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' }, 60);
    return;
  }

  const query = getQuery(req);
  const requestedGroup = query.get('group') ?? 'active';
  const group = GROUPS[requestedGroup] ? requestedGroup : 'active';
  const limit = Math.round(clampNumber(query.get('limit'), 1_000, 1, 20_000));
  const upstreamUrl = `${CELESTRAK_BASE}?GROUP=${GROUPS[group]}&FORMAT=tle`;

  try {
    const text = await cachedText(upstreamUrl, 60 * 60 * 1000);
    const data = parseTle(text, limit);
    sendJson(res, 200, {
      source: 'CelesTrak GP/TLE',
      sourceUrl: upstreamUrl,
      group,
      count: data.length,
      data,
    }, 1800);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Unable to load satellite TLEs',
      detail: error instanceof Error ? error.message : String(error),
      sourceUrl: upstreamUrl,
    }, 120);
  }
}
