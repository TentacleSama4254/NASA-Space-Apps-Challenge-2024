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
import { ThreeMFLoader } from "three/examples/jsm/Addons.js";

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
  const { handleFocus } = useCamera() as any;

  const [colourMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [EarthDayMap,EarthNormalMap, EarthSpecularMap, EarthCloudsMap])

  return (
    <RigidBody
      colliders="ball"
      userData={{ type: "Earth" }}
      type="kinematicPosition"
      // onClick={handleFocus}
      >
       <ambientLight intensity={1}/>
       <mesh>
       <sphereGeometry args={[10, 32, 32]} />
       <meshPhongMaterial map={cloudsMap}
        opacity = {0.4}
        depthWrite = {true}
        transparent = {true}
        />
       </mesh>
       <ambientLight intensity={1}/>
       <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshPhongMaterial specularMap={specularMap}/>
        <meshStandardMaterial map={colourMap} normalMap={normalMap}/>
      </mesh>

    </RigidBody>
  );
};

export default Earth;
