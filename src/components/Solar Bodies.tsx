import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { TextureLoader, Color } from "three";
import { useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";
import { now } from "three/examples/jsm/libs/tween.module.js";
import { PlanetData } from "../types/SolarBodies";
import { earthSize } from "./Earth";
import MercuryMap from "./../assets/textures/8k_mercury.jpg";

interface PlanetProps {
    count: number;
  }
  
  const PlanetProps: React.FC<PlanetData> = ({
    name,
    position,
    scale,
    orbit,
    texture_path,
  }) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const cameraContext = useCamera();
    const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  
    // const texture = useLoader(TextureLoader, "/textures/planet.jpg");
    const texture = useLoader(TextureLoader, texture_path);
        return (
        <instancedMesh
          ref={mesh}
          args={[undefined, undefined, 1]}
          onClick={handleFocus}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[earthSize*scale, 64, 64]}>
            <instancedBufferAttribute
              attach="attributes-color"
            //   args={[instanceColors, 3, true]}
            />
          </sphereGeometry>
          <meshStandardMaterial vertexColors map={texture} />
        </instancedMesh>
      );
    };
    
    export default PlanetProps;