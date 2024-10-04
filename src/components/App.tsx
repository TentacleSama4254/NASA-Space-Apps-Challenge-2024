/* eslint-disable @typescript-eslint/no-unused-vars */
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";

import Scene from "./Scene";
import Sun from "./Sun";

const App = () => (
  <Canvas camera={{ position: [0, 50, 150], far: 200000 }}>
    <color attach="background" args={["black"]} />
    <ambientLight intensity={0} />

    <OrbitControls maxDistance={1450} minDistance={10} makeDefault />

    <Physics gravity={[0, 0, 0]}>
      <Scene />
      {/* <Sun /> */}
    </Physics>

    <EffectComposer>
      <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
    </EffectComposer>
  </Canvas>
);

export default App;
