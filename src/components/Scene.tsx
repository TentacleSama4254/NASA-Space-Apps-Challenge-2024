/* eslint-disable @typescript-eslint/no-unused-vars */
import { Html, Stars } from "@react-three/drei";
import * as THREE from 'three';
import { CameraProvider, CameraContext } from "../context/Camera";
import Earth from "./Earth";
import Sun from "./Sun";
import Revolution from "./Revolution";
import Moon from "./Moon";
import Asteroid, { AsteroidProps } from "./Asteroid";
import ScaleBar from "./Scale-Bar";
import SaturnRing from "./PlanetRing";
import SolarObj from "./SolarBody";
// import AsteroidField from "./AsteroidField";
import AxesHelper from "../utils/AxesHelper";
import { PlanetData , distanceFactor} from "../config/SolarBodiesImport";
import { useContext, useEffect, useState } from "react";
import { AsteroidData } from "../assets/asteroid_api_data";

// Scene component
const Scene = () => {
  // Custom hook for gravity logic
  // useGravity();
  const [asteroids, setAsteroids] = useState<AsteroidProps[]>([]);

  useEffect(() => {
    // Parse the JSON data and set the asteroids state
    const parsedAsteroids = AsteroidData.map((data, index) => ({
      name: `Asteroid ${index + 1}`,
      diameter: 0.1, // Example diameter
      orbit: {
        a: Math.random() * 1500 + 100*index,
        e: Math.random(),
        inclination: THREE.MathUtils.degToRad(0),
        omega: THREE.MathUtils.degToRad(0),
        raan: THREE.MathUtils.degToRad(0),
        q: 10,
      },
      period: 365, // Example period
    }));
    setAsteroids(parsedAsteroids);
  }, []);

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
        <SolarObj {...PlanetData.saturn}>
          <SaturnRing
          texturePath={"https://i.postimg.cc/zz7Gr430/saturn-rings-top.png"}
          // innerRadius={PlanetData.saturn.diameter * 100 * 2}
          // outerRadius={PlanetData.saturn.diameter * 100 * 3}
          innerRadius = {160000/distanceFactor *100}
          outerRadius = {320000/distanceFactor *100}
        />
          </SolarObj>
        <SolarObj {...PlanetData.uranus}/>
        <SolarObj {...PlanetData.neptune}/>
      </Sun>

      {asteroids.slice(0,30).map((props, index) => (
        <Asteroid key={index} {...props} />
      ))}
      {/* <ExplosionProvider> */}

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
