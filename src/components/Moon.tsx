import { useRef } from "react";
import { useFrame, extend, useLoader } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import noise from "./../shaders/noise.glsl";
import { SUN_RADIUS } from "../config/constants";
import { useCamera } from "../context/Camera";

import MoonMap from "./../assets/textures/8k_moon.jpg"
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

const Moon = () => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};

  const [moonMap] = useLoader(TextureLoader, [MoonMap])

  // const earthRef = useRef() as any;

  // useFrame(({clock}) => {
  //   const elapsedTime = clock.getElapsedTime();
  //   (earthRef.current as any).rotation.x = -23.4*Math.PI/180;
  //   (cloudRef.current as any).rotation.x = -23.4*Math.PI/180;
  //   (lightsRef.current as any).rotation.x = -23.4*Math.PI/180;
  //   earthRef.current? (earthRef.current as any).rotation.y = elapsedTime/6: console.log("earthRef undefined");
  //   cloudRef.current? (cloudRef.current as any).rotation.y = elapsedTime/6: console.log("cloudRef undefined");
  //   lightsRef.current? (lightsRef.current as any).rotation.y = elapsedTime/6: console.log("lightsRef undefined");
  // } )

  return ( 
    
    <RigidBody
      
      colliders="ball"
      userData={{ type: "Moon" }}
      type="kinematicPosition"
      // onClick={handleFocus}
      >
       <ambientLight intensity={0.03}/>
       <mesh ref = {cloudRef} >
       <sphereGeometry args={[10, 132, 132]} />
       <meshPhongMaterial map={cloudsMap}
        opacity = {1}
        depthWrite = {true}
        transparent = {true} 
        blending={2}
        // side = {THREE.DoubleSide}
        />
       </mesh>

       <mesh ref = {lightsRef} >
       <sphereGeometry args={[10, 132, 132]} />
       <meshPhongMaterial map={lightsMap}
        opacity = {1}
        depthWrite = {true}
        transparent = {true} 
        blending={2}
        />
       </mesh>
      
\       <mesh ref = {earthRef}>
        <sphereGeometry args={[10, 132, 132]} />
        <meshPhongMaterial specularMap={specularMap}/>
        <meshStandardMaterial map={colourMap} normalMap={normalMap}/>
      </mesh>

    </RigidBody>
  );
};

export default Earth;
