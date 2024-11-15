import React, { useEffect, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useCamera } from "../context/Camera";
import { TextureLoader } from "three";
import * as THREE from "three";

import { OrbitalParams } from "../types";
import { propagate } from "../utils/planetCalculations";
import OrbitLine from "../context/OrbitLine"; // Import the new OrbitLine component
import { Html } from "@react-three/drei";
import { PlanetData } from "../config/SolarBodiesImport";
import PlanetLabel from "./PlanetLabel";
import { globalRefs } from "../context/GlobalRefs"; 

const EarthDayMap = "/textures/8k_earth_daymap.jpg";
const EarthNightMap = "/textures/8k_earth_nightmap.jpg";
const EarthCloudsMap = "/textures/8k_earth_clouds.jpg";
const EarthNormalMap = "/textures/8k_earth_normal_map.jpg";
const EarthSpecularMap = "/textures/8k_earth_specular_map.jpg";

export const earthSize = PlanetData.earth.diameter *100 //10;

interface EarthProps {
  children?: React.ReactNode;
  orbit?: OrbitalParams;
  centrePosition?: THREE.Vector3;
}

const Earth: React.FC<EarthProps> = ({
  children,
  orbit,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cameraZoom = cameraContext
    ? cameraContext.zoomLevel
    : new THREE.Vector3();

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
  const HtmlRef = useRef() as any;

  const [isFocused, setIsFocused] = useState(false); // State variable to track focus state
  const [planetPosition, setPlanetPosition] = useState([0, 0, 0]);
  const [tagOpacity, setTagOpacity] = useState(1); // State variable for tag opacity

  const defaultOrbit = {
    a: 4000,
    e: 0.5,
    inclination: THREE.MathUtils.degToRad(0),
    omega: THREE.MathUtils.degToRad(0),
    raan: THREE.MathUtils.degToRad(0),
    q: 10,
  };

  const orbitalParams = orbit || defaultOrbit;

  useFrame(({ clock, camera }) => {
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
        false,
        2000
      );

      const [x, y, z] = [
        centrePosition.x + position.x,
        centrePosition.y + position.y,
        centrePosition.z + position.z,
      ];

      earthRef.current.position.set(x, y, z);
      cloudRef.current.position.set(x, y, z);
      lightsRef.current.position.set(x, y, z);
      // HtmlRef.current.position.set(x, y, z);
      // console.log(HtmlRef.current);
      setPlanetPosition([x, y, z]);

      // console.log("camera at :", camera.position);
      // console.log("earth at :", earthRef.current.position);
      const distance = camera.position.distanceTo(earthRef.current.position);
      // console.log("Distance between :", distance);

      // Calculate opacity based on distance
      if (distance < 1000) {
        const newOpacity = Math.max(0, (distance - 500) / 500);
        setTagOpacity(newOpacity);
      } else {
        setTagOpacity(1);
      }
    }

    // Update focus state
    if (focusedObject?.object === earthRef.current && !isFocused) {
      setIsFocused(true);
    } else if (focusedObject?.object !== earthRef.current && isFocused) {
      setIsFocused(false);
    }
  });

  useEffect(() => {
    console.log("Earth mounted");
    globalRefs.push(earthRef);
    globalRefs.push(cloudRef);
    globalRefs.push(lightsRef);
    handleFocus({ object: earthRef.current });

    return () => {
      console.log("Earth unmounted");
      globalRefs.splice(globalRefs.indexOf(earthRef), 1);
      globalRefs.splice(globalRefs.indexOf(cloudRef), 1);
      globalRefs.splice(globalRefs.indexOf(lightsRef), 1);
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
        <mesh
          ref={cloudRef}
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
        <mesh
          ref={lightsRef}
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
      <PlanetLabel
        position={planetPosition}
        label="Earth"
        imageUrl="/textures/8k_earth_daymap.jpg"
        opacity={tagOpacity}
        onClick={() => handleFocus({ object: earthRef.current })} // Pass the onClick handler
        occlude={globalRefs.filter(
          (ref) => ref !== earthRef && ref !== cloudRef && ref !== lightsRef
        )} // Pass the objects that should occlude the PlanetTag
      />

      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ planetPosition: THREE.Vector3 }>,
            {
              planetPosition:
                earthRef?.current?.position ?? new THREE.Vector3(10, 0, 0),
            }
          );
          // return React.cloneElement(child, { planetPosition: position });
        }
        return child;
      })}
      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centrePosition}
        planetRef={earthRef}
        isFocused={isFocused}
      />
    </group>
  );
};

export default Earth;
