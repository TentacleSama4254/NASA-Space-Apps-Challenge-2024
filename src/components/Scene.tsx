/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stars } from "@react-three/drei";
import * as THREE from 'three';
import { CameraProvider } from "../context/Camera";
import { TrailProvider } from "../context/Trails";
import Earth from "./Earth";
import Sun from "./Sun";
import Revolution from "./Revolution";
import Moon from "./Moon";
import Asteroid from "./Asteroid";
import SolarObj from "./SolarBody";
// import AsteroidField from "./AsteroidField";
import AxesHelper from "../utils/AxesHelper";
import { PlanetData } from "../config/SolarBodiesImport";

// Scene component
const Scene = () => {
  // Custom hook for gravity logic
  // useGravity();

  return (
    <CameraProvider>
      {/* <AxesHelper /> */}
      <Sun>
        <Earth >
          <Moon />
        </Earth>
        <SolarObj name="Mars" diameter={9} texture_path="/textures/8k_mars.jpg"  distanceFromSun={0} period={0} position={0}/>
      </Sun>
      {/* <Moon /> */}
      {/* <ExplosionProvider> */}
      {/* <Sun /> */}
      {/* <Earth /> */}
      {/* <Earth2 /> */}
      {/* <Asteroid /> */}
      {/* <AsteroidField />  */}
      {/* <Globe  /> */}
      {/* <Test /> */}  
      <Stars depth={150000} factor={696} saturation={124} />
      {/* </ExplosionProvider> */}
      {/* <Stars depth={100000} factor={696} saturation={124} /> */}
    </CameraProvider>
  );
};

export default Scene;
