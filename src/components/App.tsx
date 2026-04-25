import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import Scene from './Scene';
import Loader from './Loader';
import ToolbarBubble from './UI/Toolbar';
import { SimulationClockProvider } from '../context/SimulationClock';
import '../index.css';

const App = () => (
  <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      camera={{ position: [0, 50, 150], far: 600000 }}
    >
      <color attach="background" args={['black']} />
      <ambientLight intensity={0} />

      <OrbitControls maxDistance={24500} minDistance={1} makeDefault />

      {/*
        SimulationClockProvider must be inside Canvas so it can use useFrame.
        It wraps both Scene and the loading indicator.
      */}
      <SimulationClockProvider>
        {/*
          The outer Suspense shows the Loader (progress bar) while any
          useLoader call inside Scene is still pending.  Each planet also
          wraps its heavy detail layers in inner Suspense boundaries so
          they appear one by one as textures complete.
        */}
        <Suspense fallback={<Loader />}>
          <Physics gravity={[0, 0, 0]}>
            <Scene />
          </Physics>
        </Suspense>
      </SimulationClockProvider>

      <EffectComposer>
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </Canvas>

    <ToolbarBubble />
  </div>
);

export default App;
