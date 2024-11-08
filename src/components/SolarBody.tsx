import React, { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";
import { TextureLoader } from "three";
import * as THREE from "three";
import { PlanetDataType, SatelliteProps } from "../types";
import { propagate } from "../utils/planetCalculations";
import OrbitLine from "../context/OrbitLine";
import SaturnRing from './PlanetRing'; // Import the SaturnRing component
import {SaturnRingProps} from './PlanetRing';import { globalRefs } from "../context/GlobalRefs"; // Import the globalRefs array

const Planet: React.FC<PlanetDataType> = ({
  name,
  diameter,
  orbit,
  texture_path,
  texture_path1,
  texture_path_ring,
  children,
  period,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;

  const [planetMap] = useLoader(TextureLoader, [texture_path]);

  const planetRef = useRef() as any;
  const planetRef1 = useRef() as any;
  const ringRef = useRef<THREE.Mesh>(null);
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
        period
      );

      const [x, y, z] = [
        centrePosition.x + position.x,
        centrePosition.y + position.y,
        centrePosition.z + position.z,
      ];

      planetRef.current.position.set(x, y, z);
      if (planetRef1) planetRef1.current?.position.set(x, y, z);
      if (ringRef.current) ringRef.current.position.set(x, y, z);
    }

    if (focusedObject?.object === planetRef.current && !isFocused) {
      setIsFocused(true);
    } else if (focusedObject?.object !== planetRef.current && isFocused) {
      setIsFocused(false);
    }
  });

  useEffect(() => {
    console.log(`${name} mounted`);
    globalRefs.push(planetRef); // Add the planetRef to the globalRefs array
    // console.log(globalRefs);

    return () => {
      console.log(`${name} unmounted`);
      globalRefs.splice(globalRefs.indexOf(planetRef), 1); // Remove the planetRef from the globalRefs array
    };
  }, []);

  return (
    <group>
      <mesh ref={planetRef} onClick={handleFocus} userData={{diameter}}>
        <sphereGeometry args={[diameter * 100, 64, 64]} />
        <meshPhongMaterial map={planetMap} />
      </mesh>

      {texture_path1 && (
        <mesh ref={planetRef1} onClick={handleFocus} userData={{ diameter }}>
          <sphereGeometry args={[diameter * 100, 64, 64]} />
          <meshPhongMaterial
            map={useLoader(TextureLoader, [texture_path1])[0]}
            opacity={1}
            depthWrite={true}
            transparent={true}
            blending={2}
          />
        </mesh>
      )}

      {/* {texture_path_ring && (
        <SaturnRing
          ref={ringRef}
          texturePath={texture_path_ring}
          innerRadius={diameter * 100 * 2}
          outerRadius={diameter * 100 * 2.5}
          planetPosition={planetRef.current ? planetRef.current.position : new THREE.Vector3()}
        />
      )} */}

      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<SatelliteProps>|React.ReactElement<SaturnRingProps>,
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