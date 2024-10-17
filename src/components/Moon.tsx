import React, { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import * as THREE from "three";
import { useCamera } from "../context/Camera";
import {
  calculateOrbitalPosition,
  propagate,
} from "../utils/planetCalculations";
import MoonMap from "./../assets/textures/8k_moon.jpg";
import { earthSize } from "./Earth";
import OrbitLine from "./OrbitLine"; // Import the OrbitLine component

interface SatelliteProps {
  planetPosition?: THREE.Vector3;
  orbit?: {
    a: number;
    e: number;
    inclination: number;
    omega: number;
    raan: number;
    q: number;
  };
}

const Satellite: React.FC<SatelliteProps> = ({
  planetPosition = new THREE.Vector3(0, 0, 0),
  orbit,
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;

  const [moonMap] = useLoader(TextureLoader, [MoonMap]);

  const moonRef = useRef<THREE.InstancedMesh>(null);
  const [isFocused, setIsFocused] = useState(false); // State variable to track focus state
  const [dynamicCentrePosition, setDynamicCentrePosition] = useState(
    planetPosition.clone()
  ); // State variable to track dynamic center position

  const defaultOrbit = {
    a: 50,
    e: 0.0,
    inclination: THREE.MathUtils.degToRad(5),
    omega: THREE.MathUtils.degToRad(0),
    raan: THREE.MathUtils.degToRad(0),
    q: 10,
  };

  const orbitalParams = orbit || defaultOrbit;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    if (moonRef.current) {
      const position = propagate(
        elapsedTime,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false
      );

      moonRef.current.position.set(
        planetPosition.x + position.x,
        planetPosition.y + position.y,
        planetPosition.z + position.z
      );
      moonRef.current.rotation.y = (elapsedTime / 6) * 0.037;

      // Update the dynamic center position
      setDynamicCentrePosition(planetPosition.clone());
    }

    // Update focus state
    if (focusedObject?.object === moonRef.current && !isFocused) {
      setIsFocused(true);
    } else if (focusedObject?.object !== moonRef.current && isFocused) {
      setIsFocused(false);
    }
  });

  return (
    <group>
      <instancedMesh
        userData={{ type: "Moon" }}
        type="kinematicPosition"
        onClick={handleFocus}
        args={[undefined, undefined, 1]}
        ref={moonRef}
      >
        <ambientLight intensity={0.03} />
        <sphereGeometry args={[earthSize * 0.27, 64, 64]} />
        <meshStandardMaterial map={moonMap} />
      </instancedMesh>
      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={dynamicCentrePosition}
        earthRef={moonRef}
        isFocused={isFocused}
      />
    </group>
  );
};

export default Satellite;
