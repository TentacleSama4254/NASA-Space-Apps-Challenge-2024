import { Stars } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { CameraProvider } from '../context/Camera';
import Earth from './Earth';
import Sun from './Sun';
import Moon from './Moon';
import Asteroid, { AsteroidProps } from './Asteroid';
import SaturnRing from './PlanetRing';
import SolarObj from './SolarBody';
import { PlanetData, distanceScaleKm } from '../config/SolarBodiesImport';
import { AsteroidData } from '../assets/asteroid_api_data';
import { preloadEphemeris } from '../domain/ephemerisService';

// ─── Asteroid belt sample ─────────────────────────────────────────────────────

/**
 * Build asteroid props from the JPL SBDB catalog fields.
 * We use the first N entries that have all required orbital fields.
 */
function buildAsteroidProps(limit: number): AsteroidProps[] {
  const props: AsteroidProps[] = [];
  for (const d of AsteroidData) {
    if (props.length >= limit) break;

    const a     = Number(d.a);
    const e     = Number(d.e);
    const i     = Number(d.i);
    const om    = Number(d.om);
    const w     = Number(d.w);
    const ma    = Number(d.ma);
    const per   = Number(d.per);
    const epoch = Number(d.epoch);

    // Skip entries with missing or clearly invalid orbital elements.
    if (!a || !isFinite(a) || !isFinite(e) || e >= 1) continue;
    if (!isFinite(i) || !isFinite(om) || !isFinite(w) || !isFinite(ma)) continue;
    if (!isFinite(per) || per <= 0 || !isFinite(epoch)) continue;

    props.push({
      name: String(d.name ?? d.full_name ?? `Asteroid ${props.length + 1}`),
      diameter: Number(d.diameter) || 1,
      orbit: {
        aAU:     a,
        e,
        i,
        om,
        w,
        ma,
        epochJd: epoch,
      },
      periodDays: per,
    });
  }
  return props;
}

const ASTEROID_SAMPLE = buildAsteroidProps(30);

// ─── Scene ────────────────────────────────────────────────────────────────────

const Scene = () => {
  // Prioritize the initial Earth focus, then trickle in the rest while idle.
  useEffect(() => {
    preloadEphemeris(['earth', 'moon'], { deferRest: true });
  }, []);

  return (
    <CameraProvider>
      <Sun>
        <SolarObj {...PlanetData.mercury} />
        <SolarObj {...PlanetData.venus} />
        <Earth orbit={PlanetData.earth.orbit}>
          <Moon />
        </Earth>
        <SolarObj {...PlanetData.mars}>
          <Moon bodyId="phobos" />
          <Moon bodyId="deimos" />
        </SolarObj>
        <SolarObj {...PlanetData.jupiter}>
          <Moon bodyId="io" />
          <Moon bodyId="europa" />
          <Moon bodyId="ganymede" />
          <Moon bodyId="callisto" />
        </SolarObj>
        <SolarObj {...PlanetData.saturn}>
          <Moon bodyId="titan" />
          <SaturnRing
            texturePath="/textures/8k_saturn_ring_alpha.png"
            innerRadius={160000 / distanceScaleKm}
            outerRadius={320000 / distanceScaleKm}
          />
        </SolarObj>
        <SolarObj {...PlanetData.uranus}>
          <Moon bodyId="titania" />
          <Moon bodyId="oberon" />
        </SolarObj>
        <SolarObj {...PlanetData.neptune}>
          <Moon bodyId="triton" />
        </SolarObj>
      </Sun>

      {ASTEROID_SAMPLE.map((props, i) => (
        <Asteroid key={`${props.name}-${i}`} {...props} />
      ))}

      <Stars depth={150000} factor={696} saturation={124} />
    </CameraProvider>
  );
};

export default Scene;
