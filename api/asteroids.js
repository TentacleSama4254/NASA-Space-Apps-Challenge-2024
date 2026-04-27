import {
  buildSbdbUrl,
  cachedJson,
  clampNumber,
  getQuery,
  normalizeSmallBody,
  rowsToObjects,
  sendJson,
} from './_space-data.mjs';

const DEFAULT_LIMITS = {
  'main-belt': 20_000,
  neo: 8_000,
  pha: 2_500,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' }, 60);
    return;
  }

  const query = getQuery(req);
  const requestedKind = query.get('kind') ?? 'neo';
  const kind = ['neo', 'pha', 'main-belt'].includes(requestedKind)
    ? requestedKind
    : 'neo';
  const limit = clampNumber(query.get('limit'), DEFAULT_LIMITS[kind], 1, 20_000);
  const upstreamUrl = buildSbdbUrl({ kind, limit });

  try {
    const payload = await cachedJson(upstreamUrl, 6 * 60 * 60 * 1000);
    const rows = rowsToObjects(payload.fields, payload.data);
    const data = rows.map(normalizeSmallBody).filter(Boolean);

    sendJson(res, 200, {
      source: 'NASA/JPL SBDB Query API',
      sourceUrl: upstreamUrl,
      kind,
      count: data.length,
      data,
    });
  } catch (error) {
    sendJson(res, 502, {
      error: 'Unable to load asteroid catalog',
      detail: error instanceof Error ? error.message : String(error),
      sourceUrl: upstreamUrl,
    }, 120);
  }
}
