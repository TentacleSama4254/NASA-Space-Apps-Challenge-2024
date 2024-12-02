import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { propagate } from "../utils/planetCalculations";
import { useCamera } from "../context/Camera";
import { Html } from "@react-three/drei";
import { globalRefs } from "../context/GlobalRefs"; // Import the globalRefs array

export interface AsteroidProps {
  name: string;
  diameter: number;
  orbit: any;
  period: number;
  centrePosition?: THREE.Vector3;
}

const Asteroid: React.FC<AsteroidProps> = ({
  name,
  diameter,
  orbit,
  period,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;

  const asteroidRef = useRef<THREE.Group>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [asteroidPosition, setAsteroidPosition] = useState([0, 0, 0]);

  const defaultOrbit = {
    a: Math.random() * 400 + 150,
    e: Math.random(),
    inclination: THREE.MathUtils.degToRad(0),
    omega: THREE.MathUtils.degToRad(0),
    raan: THREE.MathUtils.degToRad(0),
    q: 10,
  };

  const orbitalParams = orbit || defaultOrbit;
  // const orbitalParams = orbit || defaultOrbit;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();

    if (asteroidRef.current) {
      const position = propagate(
        elapsedTime,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        period
      );

      const [x, y, z] = [
        centrePosition.x + position.x,
        centrePosition.y + position.y,
        centrePosition.z + position.z,
      ];

      asteroidRef.current.position.set(x, y, z);
      setAsteroidPosition([x, y, z]);
    }

    if (focusedObject?.object === asteroidRef.current && !isFocused) {
      setIsFocused(true);
    } else if (focusedObject?.object !== asteroidRef.current && isFocused) {
      setIsFocused(false);
    }
  });

  useEffect(() => {
    console.log(`${name} mounted`);
    // globalRefs.push(asteroidRef);
    console.log("Asteroid rendered: ", asteroidPosition);
    console.log(globalRefs);

    return () => {
      console.log(`${name} unmounted`);
      // globalRefs.splice(globalRefs.indexOf(asteroidRef), 1);
    };
  }, []);


  return (
    <group ref={asteroidRef} onClick={handleFocus}>
      <Html center
        onClick={handleFocus}
        occlude={true}
        // onOcclude={(hidden: boolean) => {
        // console.log("Asteroid occluded: ", hidden);
        // }}
      >
        <div
           style={{
             width: diameter * 110,
            height: diameter * 110,
            backgroundColor: "#89d3fa",
            borderRadius: "50%",
            opacity: 0.12,
            zIndex: -9999, // Ensure the dot is always in the back
            position: "absolute",
          }}
          // onClick={handleFocus}
        />
      </Html>
    </group>
  );
};

export default Asteroid;