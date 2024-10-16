import React, { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";
import { TextureLoader } from "three";
import * as THREE from "three";

import EarthDayMap from "../assets/textures/8k_earth_daymap.jpg";
import EarthNightMap from "../assets/textures/8k_earth_nightmap.jpg";
import EarthCloudsMap from "../assets/textures/8k_earth_clouds.jpg";
import EarthNormalMap from "../assets/textures/8k_earth_normal_map.jpg";
import EarthSpecularMap from "../assets/textures/8k_earth_specular_map.jpg";
import { OrbitalParams } from "../types";
import { propagate } from "../utils/planetCalculations";

export const earthSize = 10;

interface EarthProps {
  position?: THREE.Vector3;
  children?: React.ReactNode;
  orbit?: OrbitalParams;
  centrePosition?: THREE.Vector3;
}

const Earth: React.FC<EarthProps> = ({
  position = new THREE.Vector3(0, 0, 0),
  children,
  orbit,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const mesh = useRef<THREE.InstancedMesh>(null);

  const [colourMap, normalMap, specularMap, cloudsMap, lightsMap] = useLoader(
    TextureLoader,
    [
      EarthDayMap,
      EarthNormalMap,
      EarthSpecularMap,
      EarthCloudsMap,
      EarthNightMap,
    ]
  );

  const earthRef = useRef() as any;
  const cloudRef = useRef() as any;
  const lightsRef = useRef() as any;

    const defaultOrbit = {
      a: 50,
      e: 0.5,
      inclination: THREE.MathUtils.degToRad(0),
      omega: THREE.MathUtils.degToRad(0),
      raan: THREE.MathUtils.degToRad(0),
      q: 10,
    };

    const orbitalParams = orbit || defaultOrbit;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    (earthRef.current as any).rotation.x = (-23.4 * Math.PI) / 180;
    (cloudRef.current as any).rotation.x = (-23.4 * Math.PI) / 180;
    (lightsRef.current as any).rotation.x = (-23.4 * Math.PI) / 180;
    earthRef.current
      ? ((earthRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("earthRef undefined");
    cloudRef.current
      ? ((cloudRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("cloudRef undefined");
    lightsRef.current
      ? ((lightsRef.current as any).rotation.y = elapsedTime / 6)
      : console.log("lightsRef undefined");
    
    if (earthRef.current && cloudRef.current && lightsRef.current) {
      const position = propagate(
        elapsedTime,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false
      );

      const [x, y, z] = [centrePosition.x + position.x,  centrePosition.y + position.y,  centrePosition.z + position.z];

      earthRef.current.position.set(x, y, z);
      cloudRef.current.position.set(x, y, z);
      lightsRef.current.position.set(x, y, z);
    }
  });

    useEffect(() => {
      console.log("Earth mounted");
      earthRef.current.position.set(
        position.x,
        position.y,
        position.z
      );
      cloudRef.current.position.set(position.x, position.y, position.z);
      lightsRef.current.position.set(position.x, position.y, position.z);

      return () => {
        console.log("Earth unmounted");
        // Any cleanup code can go here
      };
    }, []);
  
  

  return (
    <group>
      <instancedMesh
        // position={position}
        userData={{ type: "Earth" }}
        type="kinematicPosition"
        onClick={handleFocus}
        castShadow
        receiveShadow
        args={[undefined, undefined, 1]}
        ref={mesh}
      >
        <ambientLight intensity={0.03} />
        <mesh ref={cloudRef}
          // position={position}
        >
          <sphereGeometry args={[earthSize, 132, 132]} />
          <meshPhongMaterial
            map={cloudsMap}
            opacity={1}
            depthWrite={true}
            transparent={true}
            blending={2}
          />
        </mesh>
        <mesh ref={lightsRef}
          // position={position}
        >
          <sphereGeometry args={[earthSize, 132, 132]} />
          <meshPhongMaterial
            map={lightsMap}
            opacity={1}
            depthWrite={true}
            transparent={true}
            blending={2}
          />
        </mesh>
        <mesh ref={earthRef}>
          <sphereGeometry args={[earthSize, 132, 132]} />
          <meshPhongMaterial specularMap={specularMap} />
          <meshStandardMaterial map={colourMap} normalMap={normalMap} />
        </mesh>
      </instancedMesh>

      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ planetPosition: THREE.Vector3 }>,
            { planetPosition: earthRef?.current?.position?? position }
          );
          // return React.cloneElement(child, { planetPosition: position });
        }
        return child;
      })}
    </group>
  );
};

export default Earth;
