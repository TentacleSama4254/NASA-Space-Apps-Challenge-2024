export interface EphemerisRecord {
  time: string;
  position: { x: number; y: number; z: number };
  velocity: { vx: number; vy: number; vz: number };
}

/**
 * Fetch ephemeris data from NASA JPL HORIZONS API.
 * @param id numeric ID of the body (e.g. 399 for Earth)
 * @param start start time in ISO format (YYYY-MM-DD)
 * @param stop stop time in ISO format
 * @param step step size (e.g. '1d')
 */
export async function fetchEphemeris(
  id: number,
  start: string,
  stop: string,
  step = '1d'
): Promise<EphemerisRecord[]> {
  const url =
    `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${id}'` +
    `&EPHEM_TYPE=V&CENTER='500@0'&START_TIME=${start}&STOP_TIME=${stop}&STEP_SIZE=${step}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const text = await res.text();
  return parseHorizons(text);
}

function parseHorizons(text: string): EphemerisRecord[] {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf('$$SOE');
  const end = lines.indexOf('$$EOE');
  if (start === -1 || end === -1) return [];
  const records: EphemerisRecord[] = [];
  for (let i = start + 1; i < end; i += 5) {
    const l1 = lines[i]?.trim();
    const l2 = lines[i + 1]?.trim();
    const l3 = lines[i + 2]?.trim();
    if (!l1 || !l2 || !l3) continue;
    const time = l1.split('=')[1]?.trim();
    const x = parseFloat(/X\s*=\s*([\d.E+-]+)/.exec(l2)?.[1] || '0');
    const y = parseFloat(/Y\s*=\s*([\d.E+-]+)/.exec(l2)?.[1] || '0');
    const z = parseFloat(/Z\s*=\s*([\d.E+-]+)/.exec(l2)?.[1] || '0');
    const vx = parseFloat(/VX\s*=\s*([\d.E+-]+)/.exec(l3)?.[1] || '0');
    const vy = parseFloat(/VY\s*=\s*([\d.E+-]+)/.exec(l3)?.[1] || '0');
    const vz = parseFloat(/VZ\s*=\s*([\d.E+-]+)/.exec(l3)?.[1] || '0');
    records.push({ time, position: { x, y, z }, velocity: { vx, vy, vz } });
  }
  return records;
}
