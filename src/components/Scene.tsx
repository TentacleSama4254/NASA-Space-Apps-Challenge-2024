/* eslint-disable @typescript-eslint/no-unused-vars */
// import useGravity from "../hooks/useGravity";
import { Stars } from "@react-three/drei";
import { CameraProvider } from "../context/Camera";
import { ExplosionProvider } from "../context/Explosions";
import { TrailProvider } from "../context/Trails";
import Earth from "./Earth";

import Sun from "./Sun";
import Test from "./test";
// import Stars from "./Stars";
import Revolution from "./Revolution";
import Moon from "./Moon";

// Scene component
const Scene = () => {
  // Custom hook for gravity logic
  // useGravity();

  return (
    <CameraProvider>
      <Earth />
      <Moon />
      {/* <ExplosionProvider> */}
      <Sun />
      {/* <Earth /> */}
      {/* <Earth2 /> */}
      {/* <Globe  /> */}
      {/* <Test /> */}
      <TrailProvider>
        <Revolution Component={Moon} />
        <Revolution Component={Moon} />
        {/* <Revolution Component={Revolution} position={}/> */}
      </TrailProvider>
      <Stars depth={100000} factor={696} saturation={124} />
      {/* </ExplosionProvider> */}
      {/* <Stars depth={100000} factor={696} saturation={124} /> */}
    </CameraProvider>
  );
};

export default Scene;
