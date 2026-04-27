import { sendJson } from './_space-data.mjs';

const MISSIONS = [
  {
    id: 'voyager1',
    name: 'Voyager 1',
    horizonsId: -31,
    launchDate: '1977-09-05',
    active: true,
    modelPath: null,
    trajectorySource: 'JPL Horizons VECTORS',
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    horizonsId: -32,
    launchDate: '1977-08-20',
    active: true,
    modelPath: null,
    trajectorySource: 'JPL Horizons VECTORS',
  },
  {
    id: 'newHorizons',
    name: 'New Horizons',
    horizonsId: -98,
    launchDate: '2006-01-19',
    active: true,
    modelPath: null,
    trajectorySource: 'JPL Horizons VECTORS',
  },
  {
    id: 'jamesWebb',
    name: 'James Webb Space Telescope',
    horizonsId: -170,
    launchDate: '2021-12-25',
    active: true,
    modelPath: null,
    trajectorySource: 'JPL Horizons VECTORS',
  },
  {
    id: 'parkerSolar',
    name: 'Parker Solar Probe',
    horizonsId: -96,
    launchDate: '2018-08-12',
    active: true,
    modelPath: null,
    trajectorySource: 'JPL Horizons VECTORS',
  },
];

export default function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' }, 60);
    return;
  }

  sendJson(res, 200, {
    source: 'Local mission registry; trajectories should be generated from JPL Horizons',
    modelSource: 'NASA 3D Resources when available, Meshy-generated GLB fallback after review',
    count: MISSIONS.length,
    data: MISSIONS,
  }, 86_400);
}

