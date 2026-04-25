#!/usr/bin/env node
/**
 * scripts/fetchEphemeris.mjs
 *
 * Downloads JPL Horizons VECTORS ephemeris data for all solar system bodies
 * and writes compact JSON files to public/ephemeris/<bodyId>.json.
 *
 * Usage:
 *   npm run fetch-ephemeris
 *
 * Requirements: Node.js 18+ (native fetch).
 * Re-run whenever you want to refresh the data window.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../public/ephemeris');

// ─── Configuration ────────────────────────────────────────────────────────────

const START = '2024-01-01';
const STOP  = '2027-12-31';

/** Julian date epoch for Unix time 0 (1970-01-01 00:00:00 UTC) */
const JD_UNIX_EPOCH = 2440587.5;

/**
 * Bodies to fetch.
 * center = Horizons CENTER parameter:
 *   '500@10'  = heliocentric (Sun center)
 *   '500@399' = geocentric   (Earth center, used for Moon)
 */
const BODIES = [
  { id: 'mercury', horizonsId: 199, center: '500@10',  step: '1d' },
  { id: 'venus',   horizonsId: 299, center: '500@10',  step: '1d' },
  { id: 'earth',   horizonsId: 399, center: '500@10',  step: '1d' },
  { id: 'mars',    horizonsId: 499, center: '500@10',  step: '1d' },
  { id: 'jupiter', horizonsId: 599, center: '500@10',  step: '1d' },
  { id: 'saturn',  horizonsId: 699, center: '500@10',  step: '1d' },
  { id: 'uranus',  horizonsId: 799, center: '500@10',  step: '1d' },
  { id: 'neptune', horizonsId: 899, center: '500@10',  step: '1d' },
  // Moon at 6-hour steps for smooth sub-monthly interpolation
  { id: 'moon',    horizonsId: 301, center: '500@399', step: '6h' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jdToUnixMs(jd) {
  return (jd - JD_UNIX_EPOCH) * 86400000;
}

function buildUrl(horizonsId, center, step) {
  // Build query string manually — single quotes around values are required by Horizons.
  const parts = [
    `format=text`,
    `COMMAND='${horizonsId}'`,
    `CENTER='${center}'`,
    `EPHEM_TYPE=VECTORS`,
    `START_TIME='${START}'`,
    `STOP_TIME='${STOP}'`,
    `STEP_SIZE='${step}'`,
    `OUT_UNITS='KM-S'`,
  ];
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${parts.join('&')}`;
}

/**
 * Parse Horizons plain-text VECTORS output.
 *
 * Each record is exactly 4 lines within $$SOE / $$EOE (no blank separator):
 *   0: "<JD> = <calendar date> TDB"
 *   1: " X = <km>   Y = <km>   Z = <km>"
 *   2: " VX= <km/s>  VY= <km/s>  VZ= <km/s>"
 *   3: " LT= ...   RG= ...   RR= ..."  (skipped)
 */
function parseHorizons(text, meta) {
  const lines = text.split(/\r?\n/);
  const soe = lines.indexOf('$$SOE');
  const eoe = lines.indexOf('$$EOE');

  if (soe === -1 || eoe === -1) {
    const excerpt = text.slice(0, 800);
    console.error('  ✗  Could not find $$SOE/$$EOE markers. Response excerpt:');
    console.error(excerpt);
    return null;
  }

  const records = [];

  for (let i = soe + 1; i < eoe; i += 4) {
    const l0 = lines[i]?.trim();
    const l1 = lines[i + 1]?.trim();
    const l2 = lines[i + 2]?.trim();
    if (!l0 || !l1 || !l2) continue;

    const jdMatch = /^([\d.]+)\s*=/.exec(l0);
    if (!jdMatch) continue;
    const tdbJd  = parseFloat(jdMatch[1]);
    const unixMs = jdToUnixMs(tdbJd);

    const xm  = /X\s*=\s*([-\d.E+]+)/i.exec(l1);
    const ym  = /Y\s*=\s*([-\d.E+]+)/i.exec(l1);
    const zm  = /Z\s*=\s*([-\d.E+]+)/i.exec(l1);
    const vxm = /VX\s*=\s*([-\d.E+]+)/i.exec(l2);
    const vym = /VY\s*=\s*([-\d.E+]+)/i.exec(l2);
    const vzm = /VZ\s*=\s*([-\d.E+]+)/i.exec(l2);

    if (!xm || !ym || !zm || !vxm || !vym || !vzm) continue;

    records.push({
      tdbJd,
      unixMs,
      posKm:  [parseFloat(xm[1]),  parseFloat(ym[1]),  parseFloat(zm[1])],
      velKmS: [parseFloat(vxm[1]), parseFloat(vym[1]), parseFloat(vzm[1])],
    });
  }

  return {
    bodyId:      meta.id,
    horizonsId:  meta.horizonsId,
    centerId:    meta.center,
    frame:       'ECLIPJ2000',
    generatedAt: new Date().toISOString(),
    sourceUrl:   meta.url,
    records,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function fetchBody(body) {
  const url = buildUrl(body.horizonsId, body.center, body.step);
  console.log(`\nFetching ${body.id.padEnd(8)} (NAIF ${body.horizonsId}) …`);

  let text;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    text = await res.text();
  } catch (err) {
    console.error(`  ✗  Network error: ${err.message}`);
    return false;
  }

  const series = parseHorizons(text, { ...body, url });
  if (!series) return false;

  const json = JSON.stringify(series);
  const outPath = join(OUTPUT_DIR, `${body.id}.json`);
  writeFileSync(outPath, json);
  const sizeMb = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  console.log(`  ✓  ${series.records.length} records → ${outPath} (${sizeMb} MB)`);
  return true;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('JPL Horizons ephemeris fetcher');
  console.log('================================');
  console.log(`Range : ${START} → ${STOP}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  let ok = 0;
  for (const body of BODIES) {
    const success = await fetchBody(body);
    if (success) ok++;
    if (body !== BODIES[BODIES.length - 1]) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Completed: ${ok}/${BODIES.length} bodies`);
  if (ok < BODIES.length) {
    console.log(
      'Missing files will cause the app to fall back to Keplerian propagation.',
    );
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
