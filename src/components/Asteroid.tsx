import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { TextureLoader } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { useCamera } from "../context/Camera";
import { earthSize } from "./Earth";
import { PlanetData } from "../types/SolarBodies";

const STL_Paths = [
  // "/asteroids/asteroid_1.stl",
  "asteroids/asteroid_2.stl",
  "asteroids/asteroid_3.stl",
  // "asteroids/asteroid_4.stl",
  // "asteroids/asteroid_5.stl",
];

const Asteroid: React.FC<PlanetData> = ({
  name,
  position,
  scale,
  texture_path,
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  // Randomly select an STL path
  const randomSTLPath = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * STL_Paths.length);
    return STL_Paths[randomIndex];
  }, []);

  // Load the selected STL model
  const geometry = useLoader(STLLoader, randomSTLPath);

  // Load the texture
  const moonMap = useLoader(TextureLoader, "/textures/8k_mercury.jpg");

  const moonRef = useRef() as any;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    moonRef.current
      ? ((moonRef.current as any).rotation.y = (elapsedTime / 6) * 0.037)
      : console.log("moonRef undefined");
  });

  return (
    <RigidBody
      colliders="ball"
      userData={{ type: "Asteroid" }}
      type="kinematicPosition"
      position={[50, 0, 0]}
      // onClick={handleFocus}
    >
      {/* <ambientLight intensity={0.001} /> */}
      <mesh ref={moonRef} geometry={geometry}>
        <meshPhongMaterial
          map={moonMap}
          depthWrite={true}
          
          // blending={2}
        />
      </mesh>
    </RigidBody>
  );
};

export default Asteroid;
