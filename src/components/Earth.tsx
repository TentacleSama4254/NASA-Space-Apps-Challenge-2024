import { useRef } from "react";
import { useFrame, extend, useLoader } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import noise from "./../shaders/noise.glsl";
import { SUN_RADIUS } from "../config/constants";
import { useCamera } from "../context/Camera";

import EarthDayMap from "../assets/textures/8k_earth_daymap.jpg"
import EarthNightMap from "../assets/textures/8k_earth_nightmap.jpg"
import EarthCloudsMap from "../assets/textures/8k_earth_clouds.jpg"
import EarthNormalMap from "../assets/textures/8k_earth_normal_map.jpg"
import EarthSpecularMap from "../assets/textures/8k_earth_specular_map.jpg"
import { TextureLoader } from "three";


import * as THREE from 'three'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      customShaderMaterial: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.Ref<any>;
        emissiveIntensity?: number;
        time?: number;
      };
    }
  }
}

const Earth = () => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  const [colourMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [EarthDayMap,EarthNormalMap, EarthSpecularMap, EarthCloudsMap])

  const earthRef = useRef() as any;
  const cloudRef = useRef() as any;

  useFrame(({clock}) => {
    const elapsedTime = clock.getElapsedTime();
    earthRef.current? (earthRef.current as any).rotation.y = elapsedTime/6: console.log("earthRef undefined");
    // cloudRef.current? (cloudRef.current as any).rotation.y = elapsedTime/6: console.log("cloudRef undefined");
  }

  )

  return (
    
    <RigidBody
      
      colliders="ball"
      userData={{ type: "Earth" }}
      type="kinematicPosition"
      position={[50,50,50]}
      // onClick={handleFocus}
      >
       <ambientLight intensity={0.1}/>
       <mesh ref = {cloudRef} >
       <sphereGeometry args={[10, 64, 64]} />
       <meshPhongMaterial map={cloudsMap}
        opacity = {1}
        depthWrite = {true}
        transparent = {true} 
        blending={2}
        // side = {THREE.DoubleSide}
        />
       </mesh>
      
       <instancedMesh onClick={handleFocus}>
       <mesh ref = {earthRef}>
    
        <sphereGeometry args={[10, 64, 64]} />
        <meshPhongMaterial specularMap={specularMap}/>
        <meshStandardMaterial map={colourMap} normalMap={normalMap}/>
      </mesh>
      </instancedMesh>

    </RigidBody>
  );
};

export default Earth;
