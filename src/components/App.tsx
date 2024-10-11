import React from "react";
import Sun from "./Sun";
// import Test from "./test";
// import System from "./System";
import { Canvas } from "@react-three/fiber";
import { OrbitControls} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Scene from "./Scene";
import ToolbarBubble from "./UI/Toolbar";
import { Physics } from "@react-three/rapier";
import '../index.css';

const App = () => (
  <div style={{ position: "relative", width: "100%", height: "100vh" }}>
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      camera={{ position: [0, 50, 150], far: 200000 }}
    >
      <color attach="background" args={["black"]} />
      <ambientLight intensity={0} />

      <OrbitControls maxDistance={2450} minDistance={1} makeDefault />

      <Physics gravity={[0, 0, 0]}>
        <Scene />
        {/* <Sun /> */}
      </Physics>

      <EffectComposer>
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </Canvas>
  
      <ToolbarBubble />
 
  </div>
);

export default App;
