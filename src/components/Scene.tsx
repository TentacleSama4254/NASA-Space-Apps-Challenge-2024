import { useEffect } from 'react';
import { CameraProvider } from '../context/Camera';
import Earth from './Earth';
import Sun from './Sun';
import Moon from './Moon';
import AsteroidCloud, { AsteroidLayerToggles } from './AsteroidCloud';
import SaturnRing from './PlanetRing';
import SolarObj from './SolarBody';
import { PlanetData, distanceScaleKm } from '../config/SolarBodiesImport';
import { preloadEphemeris } from '../domain/ephemerisService';
import { MOON_IDS_BY_PARENT } from '../domain/bodyRegistry';
import ProceduralStarfield from './sky/ProceduralStarfield';

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  asteroidLayers?: AsteroidLayerToggles;
  onAsteroidStatsChange?: (stats: { visible: number; loading: boolean }) => void;
}

const DEFAULT_ASTEROID_LAYERS: AsteroidLayerToggles = {
  mainBelt: true,
  nearEarth: true,
  pha: true,
  closeApproaches: true,
};

const Scene = ({
  asteroidLayers = DEFAULT_ASTEROID_LAYERS,
  onAsteroidStatsChange,
}: SceneProps) => {
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
          {MOON_IDS_BY_PARENT.earth.map((bodyId) => (
            <Moon key={bodyId} bodyId={bodyId} />
          ))}
        </Earth>
        <SolarObj {...PlanetData.mars}>
          {MOON_IDS_BY_PARENT.mars.map((bodyId) => (
            <Moon key={bodyId} bodyId={bodyId} />
          ))}
        </SolarObj>
        <SolarObj {...PlanetData.jupiter}>
          {MOON_IDS_BY_PARENT.jupiter.map((bodyId) => (
            <Moon key={bodyId} bodyId={bodyId} />
          ))}
        </SolarObj>
        <SolarObj {...PlanetData.saturn}>
          {MOON_IDS_BY_PARENT.saturn.map((bodyId) => (
            <Moon key={bodyId} bodyId={bodyId} />
          ))}
          <SaturnRing
            texturePath="/textures/8k_saturn_ring_alpha.png"
            innerRadius={160000 / distanceScaleKm}
            outerRadius={320000 / distanceScaleKm}
          />
        </SolarObj>
        <SolarObj {...PlanetData.uranus}>
          {MOON_IDS_BY_PARENT.uranus.map((bodyId) => (
            <Moon key={bodyId} bodyId={bodyId} />
          ))}
        </SolarObj>
        <SolarObj {...PlanetData.neptune}>
          {MOON_IDS_BY_PARENT.neptune.map((bodyId) => (
            <Moon key={bodyId} bodyId={bodyId} />
          ))}
        </SolarObj>
        <SolarObj {...PlanetData.pluto} />
      </Sun>

      <AsteroidCloud toggles={asteroidLayers} onStatsChange={onAsteroidStatsChange} />

      <ProceduralStarfield />
    </CameraProvider>
  );
};

export default Scene;
