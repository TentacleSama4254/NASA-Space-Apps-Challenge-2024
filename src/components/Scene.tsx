/* eslint-disable @typescript-eslint/no-unused-vars */
import { Html, Stars } from "@react-three/drei";
import * as THREE from 'three';
import { CameraProvider, CameraContext } from "../context/Camera";
import Earth from "./Earth";
import Sun from "./Sun";
import Revolution from "./Revolution";
import Moon from "./Moon";
import Asteroid from "./Asteroid";
import ScaleBar from "./Scale-Bar";
import SolarObj from "./SolarBody";
// import AsteroidField from "./AsteroidField";
import AxesHelper from "../utils/AxesHelper";
import { PlanetData } from "../config/SolarBodiesImport";
import { useContext } from "react";

// Scene component
const Scene = () => {
  // Custom hook for gravity logic
  // useGravity();
  const cameraContext = useContext(CameraContext);
  const scaleTextKm = cameraContext?.scaleTextKm ?? '---';
  const scaleTextAu = cameraContext?.scaleTextAu ?? 'HELLO';

  return (
    <CameraProvider>
      {/* <AxesHelper /> */}
      <Sun>
        <SolarObj {...PlanetData.mercury}/>
        <SolarObj {...PlanetData.venus}/>
        <Earth orbit={PlanetData.earth.orbit}>
          <Moon />
        </Earth>
        <SolarObj {...PlanetData.mars}/>
        <SolarObj {...PlanetData.jupiter}/>
        <SolarObj {...PlanetData.saturn}/>
        <SolarObj {...PlanetData.uranus}/>
        <SolarObj {...PlanetData.neptune}/>
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
      {/* <Html position={[0, 0, 0]} style={{ pointerEvents: "none" }}>
        <ScaleBar scaleTextKm={scaleTextKm} scaleTextAu={scaleTextAu} padding_bottom={10} padding_left={10} />
      </Html> */}
      {/* <Stars depth={100000} factor={696} saturation={124} /> */}
    </CameraProvider>
  );
};

export default Scene;
