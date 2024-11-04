/* eslint-disable @typescript-eslint/no-unused-vars */
// import useGravity from "../hooks/useGravity";
import { Stars } from "@react-three/drei";
import * as THREE from 'three';
import { CameraProvider } from "../context/Camera";
import { TrailProvider } from "../context/Trails";
import Earth from "./Earth";

import Sun from "./Sun";
// import Test from "./test";
// import Stars from "./Stars";
import Revolution from "./Revolution";
import Moon from "./Moon";
// import PlanetProps from "./Solar Bodies";
import Asteroid from "./Asteroid";
import SolarObj from "./SolarBody";
import AsteroidField from "./AsteroidField";
import { PlanetData } from "../config/SolarBodiesImport";

// Scene component
const Scene = () => {
  // Custom hook for gravity logic
  // useGravity();

  return (
    <CameraProvider>
      <Earth position={new THREE.Vector3(0, 0, 0)} />
      {/* <Moon /> */}
      {/* <SolarObj {...PlanetData.mercury} heliocentric={true} */}
      <Revolution Component={SolarObj} componentProps={PlanetData.mercury} heliocentric={false} />
     

      {/* <ExplosionProvider> */}
      <Sun />
      {/* <Earth /> */}
      {/* <Earth2 /> */}
      {/* <Asteroid /> */}
      {/* <AsteroidField /> */}
      {/* <Globe  /> */}
      {/* <Test /> */}
      <TrailProvider>
        <Revolution Component={Moon} heliocentric={false} />
        {/* <Revolution Component={Revolution} position={}/> */}
      </TrailProvider>
      <Stars depth={150000} factor={696} saturation={124} />
      {/* </ExplosionProvider> */}
      {/* <Stars depth={100000} factor={696} saturation={124} /> */}
    </CameraProvider>
  );
};

export default Scene;
