import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { TextureLoader, Color } from "three";
import { useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";

interface PlanetProps {
  count: number;
}

const Planet: React.FC<PlanetProps> = ({ count }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  const texture = useLoader(TextureLoader, "/textures/planet.jpg");

  // Create a random color for each instance
  const instanceColors = useMemo(() => {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random natural looking planet hue
      const hue = 250 + Math.random() * 50;

      // Random saturation and lightness
      const saturation = 40 + Math.random() * 60;
      const lightness = 60;

      const hslColor = new Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      hslColor.toArray(colors, i * 3);
    }
    return colors;
  }, [count]);

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

export default Planet;
