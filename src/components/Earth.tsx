import { useRef } from "react";
import { useFrame, extend, useLoader } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import noise from "./../shaders/noise.glsl";
import { SUN_RADIUS } from "../config/constants";
import { useCamera } from "../context/Camera";

import EarthDayMap from "../assets/textures/8k_earth_daymap.jpg";
import EarthNightMap from "../assets/textures/8k_earth_nightmap.jpg";
import EarthCloudsMap from "../assets/textures/8k_earth_clouds.jpg";
import EarthNormalMap from "../assets/textures/8k_earth_normal_map.jpg";
import EarthSpecularMap from "../assets/textures/8k_earth_specular_map.jpg";
import { TextureLoader } from "three";

import * as THREE from "three";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      customShaderMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        ref?: React.Ref<any>;
        emissiveIntensity?: number;
        time?: number;
      };
    }
  }
}

interface EarthProps {
  position: THREE.Vector3;
}

const Earth: React.FC<EarthProps> = ({ position }) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  const [colourMap, normalMap, specularMap, cloudsMap, lightsMap] = useLoader(
    TextureLoader,
    [
      EarthDayMap,
      EarthNormalMap,
      EarthSpecularMap,
      EarthCloudsMap,
      EarthNightMap,
    ]
  );

  const earthRef = useRef() as any;
  const cloudRef = useRef() as any;
  const lightsRef = useRef() as any;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    (earthRef.current as any).rotation.x = (-23.4 * Math.PI) / 180;
    (cloudRef.current as any).rotation.x = (-23.4 * Math.PI) / 180;
    (lightsRef.current as any).rotation.x = (-23.4 * Math.PI) / 180;
    earthRef.current
      ? ((earthRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("earthRef undefined");
    cloudRef.current
      ? ((cloudRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("cloudRef undefined");
    lightsRef.current
      ? ((lightsRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("lightsRef undefined");
  });

  return (
    <instancedMesh
      position={position}
      userData={{ type: "Earth" }}
      onClick={handleFocus}
      castShadow
      receiveShadow
    >
      <ambientLight intensity={0.03} />
      <mesh ref={cloudRef}>
        <sphereGeometry args={[10, 132, 132]} />
        <meshPhongMaterial
          map={cloudsMap}
          opacity={1}
          depthWrite={true}
          transparent={true}
          blending={2}
        />
      </mesh>
      <mesh ref={lightsRef}>
        <sphereGeometry args={[10, 132, 132]} />
        <meshPhongMaterial
          map={lightsMap}
          opacity={1}
          depthWrite={true}
          transparent={true}
          blending={2}
        />
      </mesh>
      <mesh ref={earthRef}>
        <sphereGeometry args={[10, 132, 132]} />
        <meshPhongMaterial specularMap={specularMap} />
        <meshStandardMaterial map={colourMap} normalMap={normalMap} />
      </mesh>
    </instancedMesh>
  );
};

export default Earth;
