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
  const [opacity, setOpacity] = useState(0.12); // State for opacity

  const defaultOrbit = {
    a: Math.random() * 400 + 150,
    e: Math.random(),
    inclination: THREE.MathUtils.degToRad(0),
    omega: THREE.MathUtils.degToRad(0),
    raan: THREE.MathUtils.degToRad(0),
    q: 10,
  };

  const orbitalParams = orbit || defaultOrbit;

  useFrame(({ clock, camera }) => {
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

      // Calculate the distance to the camera
      const distance = cameraContext?.focusedObject 
        ? camera.position.distanceTo(cameraContext.focusedObject.object.position) 
        : camera.position.distanceTo(asteroidRef.current.position);
      console.log("Distance to focused object: ", distance);

      // Adjust opacity based on distance 
      // if the planet is zoomed into the asteroids dissapperar, the occuldion feature produces too much prcoesing power for all the asteroids
      if (distance < 100) {
        setOpacity(0); // 100% transparent when closer than 100 units
      } else {
        setOpacity(0.12); // Default opacity
      }
    }

    if (focusedObject?.object === asteroidRef.current && !isFocused) {
      setIsFocused(true);
    } else if (focusedObject?.object !== asteroidRef.current && isFocused) {
      setIsFocused(false);
    }
  });

  useEffect(() => {
    console.log(`${name} mounted`);
    globalRefs.push(asteroidRef);
    console.log("Asteroid rendered: ", asteroidPosition);

    return () => {
      console.log(`${name} unmounted`);
    };
  }, []);

  return (
    <group ref={asteroidRef} onClick={handleFocus}>
      <Html center
        onClick={handleFocus}
        // occlude={true}
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