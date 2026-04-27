import {
  buildCadUrl,
  cachedJson,
  clampNumber,
  getQuery,
  normalizeCloseApproach,
  rowsToObjects,
  sendJson,
} from './_space-data.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' }, 60);
    return;
  }

  const query = getQuery(req);
  const days = Math.round(clampNumber(query.get('days'), 365, 1, 36_525));
  const distMaxAu = clampNumber(query.get('distMaxAu'), 0.08, 0.00001, 5);
  const limit = Math.round(clampNumber(query.get('limit'), 300, 1, 2_000));
  const upstreamUrl = buildCadUrl({ days, distMaxAu, limit });

  try {
    const payload = await cachedJson(upstreamUrl, 60 * 60 * 1000);
    const rows = rowsToObjects(payload.fields, payload.data);
    const data = rows.map(normalizeCloseApproach).filter(Boolean);

    sendJson(res, 200, {
      source: 'NASA/JPL CNEOS Close-Approach Data API',
      sourceUrl: upstreamUrl,
      days,
      distMaxAu,
      count: data.length,
      data,
    }, 1800);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Unable to load close-approach feed',
      detail: error instanceof Error ? error.message : String(error),
      sourceUrl: upstreamUrl,
    }, 120);
  }
}

