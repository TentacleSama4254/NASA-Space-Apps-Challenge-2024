import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { TextureLoader, Color } from "three";
import { useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";
import { now } from "three/examples/jsm/libs/tween.module.js";
import { AsteroidData } from "../types/Asteroid";

interface PlanetProps {
  count: number;
}

const Asteroid: React.FC<AsteroidData> = ({
  key,
  position,
  scale,
  userData,
  orbit,
}) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  const texture = useLoader(TextureLoader, "/textures/planet.jpg");

  // Create a random color for each instance
    const colors = new Float32Array(count * 3);

      // Random natural looking planet hue
      const hue = 250 + Math.random() * 50;

      // Random saturation and lightness
      const saturation = 40 + Math.random() * 60;
      const lightness = 60;

      const hslColor = new Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      hslColor.toArray(colors, i * 3);
    

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      onClick={handleFocus}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[2, 32, 32]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[instanceColors, 3]}
        />
      </sphereGeometry>
      <meshStandardMaterial vertexColors map={texture} />
    </instancedMesh>
  );
};

export default Asteroid;
