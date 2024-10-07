/* eslint-disable @typescript-eslint/no-unused-vars */
// import useGravity from "../hooks/useGravity";
import { Stars } from "@react-three/drei";
import * as THREE from 'three';
import { CameraProvider } from "../context/Camera";
import { ExplosionProvider } from "../context/Explosions";
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

// Scene component
const Scene = () => {
  // Custom hook for gravity logic
  // useGravity();

  return (
    <CameraProvider>
      <Earth position={new THREE.Vector3(0, 0, 0)} />
      {/* <Moon /> */}
      {/* <SolarObj
        name="Mercury"
        position={[40, 0, 0]}
        scale={0.5}
        orbit={{
          a: 25,
          e: 1,
          inclination: 0,
          omega: 0,
          raan: 0,
          q: 10,
        }}
        texture_path={"/textures/8k_mars.jpg"}
      /> */}

      {/* <ExplosionProvider> */}
      <Sun />
      {/* <Earth /> */}
      {/* <Earth2 /> */}
      {/* <Asteroid /> */}
      <AsteroidField />
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
