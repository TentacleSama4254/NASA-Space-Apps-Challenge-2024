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
  "assets/asteroids/asteroid_1.stl",
  "assets/asteroids/asteroid_2.stl",
  "assets/asteroids/asteroid_3.stl",
  "assets/asteroids/asteroid_4.stl",
];

const Asteroid = () => {
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
  const moonMap = useLoader(TextureLoader, texture_path);

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
      userData={{ type: "Moon" }}
      type="kinematicPosition"
      position={[50, 0, 0]}
      // onClick={handleFocus}
    >
      <ambientLight intensity={0.03} />
      <mesh ref={moonRef} geometry={geometry}>
        <meshPhongMaterial map={moonMap} />
      </mesh>
    </RigidBody>
  );
};

export default Asteroid;
