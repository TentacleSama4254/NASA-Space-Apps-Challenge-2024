import { useRef } from "react";
import { useFrame, extend, useLoader } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import noise from "./../shaders/noise.glsl";
import { SUN_RADIUS } from "../config/constants";
import { useCamera } from "../context/Camera";

import { TextureLoader } from "three";

import * as THREE from "three";
import { earthSize } from "./Earth";
import { PlanetDataType } from "../types/SolarBodies";



const SolarBody: React.FC<PlanetDataType> = ({
  name,
  position,
  diameter,
  orbit,
  texture_path,
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  // const [moonMap] = useLoader(TextureLoader, [MoonMap])
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
      <mesh ref={moonRef}>
        <sphereGeometry args={[diameter, 64, 64]} />
        <meshPhongMaterial map={moonMap} />
      </mesh>
    </RigidBody>
  );
};

export default SolarBody;
