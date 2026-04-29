import { Suspense, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import { Analytics } from '@vercel/analytics/react';
import Scene from './Scene';
import Loader from './Loader';
import ToolbarBubble from './UI/Toolbar';
import SimulationHud from './UI/SimulationHud';
import ScaleBar from './Scale-Bar';
import { SimulationClockProvider } from '../context/SimulationClock';
import type { AsteroidLayerToggles } from './AsteroidCloud';
import '../index.css';

const App = () => {
  const [asteroidLayers, setAsteroidLayers] = useState<AsteroidLayerToggles>({
    mainBelt: true,
    nearEarth: true,
    pha: true,
    closeApproaches: true,
  });
  const [asteroidStats, setAsteroidStats] = useState({ visible: 0, loading: true });
  const handleAsteroidStatsChange = useCallback((stats: { visible: number; loading: boolean }) => {
    setAsteroidStats(stats);
  }, []);

  return (
    <SimulationClockProvider>
      <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 50, 150], near: 0.0001, far: 600000 }}
      >
        <color attach="background" args={['black']} />
        <ambientLight intensity={0.04} />

        <OrbitControls maxDistance={24500} minDistance={0.0005} makeDefault />

        <Suspense fallback={<Loader />}>
          <Physics gravity={[0, 0, 0]}>
            <Scene
              asteroidLayers={asteroidLayers}
              onAsteroidStatsChange={handleAsteroidStatsChange}
            />
          </Physics>
        </Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={0.14} luminanceSmoothing={0.9} intensity={0.85} height={300} />
        </EffectComposer>
      </Canvas>

      <SimulationHud />
      <ToolbarBubble
        asteroidLayers={asteroidLayers}
        onAsteroidLayersChange={setAsteroidLayers}
        asteroidStats={asteroidStats}
      />
      <ScaleBar />
      <Analytics />
      </div>
    </SimulationClockProvider>
  );
};

export default App;
