import React, { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";
import { TextureLoader } from "three";
import * as THREE from "three";
import { PlanetData, SatelliteProps } from "../types";
import { propagate } from "../utils/planetCalculations";
import OrbitLine from "./OrbitLine";

const Planet: React.FC<PlanetData> = ({
  name,
  scale,
  orbit,
  texture_path,
  children,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;

  const [planetMap] = useLoader(TextureLoader, [texture_path]);

  const planetRef = useRef() as any;

  const [isFocused, setIsFocused] = useState(false);

  const defaultOrbit = {
    a: 5000,
    e: 0.5,
    inclination: THREE.MathUtils.degToRad(0),
    omega: THREE.MathUtils.degToRad(0),
    raan: THREE.MathUtils.degToRad(0),
    q: 10,
  };

  const orbitalParams = orbit || defaultOrbit;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    planetRef.current
      ? ((planetRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("planetRef undefined");

    if (planetRef.current) {
      const position = propagate(
        elapsedTime,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        2500
      );

      const [x, y, z] = [
        centrePosition.x + position.x,
        centrePosition.y + position.y,
        centrePosition.z + position.z,
      ];

      planetRef.current.position.set(x, y, z);
    }

    if (focusedObject?.object === planetRef.current && !isFocused) {
      setIsFocused(true);
    } else if (focusedObject?.object !== planetRef.current && isFocused) {
      setIsFocused(false);
    }
  });

  useEffect(() => {
    console.log(`${name} mounted`);
    // handleFocus({ object: planetRef.current });

    return () => {
      console.log(`${name} unmounted`);
    };
  }, []);

  return (
    <group>
      <mesh ref={planetRef} onClick={handleFocus}>
        <sphereGeometry args={[scale, 64, 64]} />
        <meshPhongMaterial map={planetMap} />
      </mesh>

      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<SatelliteProps>,
            {
              planetPosition:
                planetRef?.current?.position ?? new THREE.Vector3(10, 0, 0),
            }
          );
        }
        return child;
      })}

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centrePosition}
        planetRef={planetRef}
        isFocused={isFocused}
      />
    </group>
  );
};

export default Planet;
