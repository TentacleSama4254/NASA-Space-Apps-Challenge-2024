import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { propagate } from "../utils/planetCalculations";
import { OrbitalParams } from "../types";

interface OrbitLineProps {
  orbitalParams: OrbitalParams;
  centrePosition: THREE.Vector3;
  planetRef: React.RefObject<THREE.Object3D>;
  isFocused: boolean; // Add isFocused prop
}

const OrbitLine: React.FC<OrbitLineProps> = ({
  orbitalParams,
  centrePosition,
  planetRef,
  isFocused,
}) => {
  const orbitRef = useRef<THREE.Line | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);

  useEffect(() => {
    const points = [];
    const numPoints = 1000; // Increase the number of points for a smoother orbit
    const period = 20000; // The period of the orbit

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * period; // Adjust the period as needed
      const position = propagate(
        t,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        period
      );
      points.push(
        new THREE.Vector3(
          centrePosition.x + position.x,
          centrePosition.y + position.y,
          centrePosition.z + position.z
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
    });
    const orbitLine = new THREE.Line(geometry, material);
    orbitRef.current = orbitLine;

    // Trigger a re-render
    setRenderTrigger((prev) => prev + 1);
  }, [orbitalParams, centrePosition]);

  useEffect(() => {
    // Trigger a re-render when focus state changes
    setRenderTrigger((prev) => prev + 1);
  }, [isFocused]);

  useFrame(({ camera }) => {
    if (orbitRef.current && planetRef.current) {
      const material = orbitRef.current.material as THREE.LineBasicMaterial;
      const distance = camera.position.distanceTo(planetRef.current.position);
      const maxDistance = 4000; // Adjust this value as needed
      const minOpacity = 0.08; // Minimum opacity value
      const maxOpacity = 1.0; // Maximum opacity value

      const opacity = THREE.MathUtils.clamp(
        maxOpacity - (distance / maxDistance) * (maxOpacity - minOpacity),
        minOpacity,
        maxOpacity
      );

      material.opacity = opacity; // Adjust opacity based on distance
      material.transparent = true;

      if (isFocused) {
        material.color.set(0xffffff); // Bright color when focused
      } else {
        material.color.set(0x888888); // Dim color when not focused
      }
    }
  });

  return orbitRef.current ? (
    <primitive object={orbitRef.current} key={renderTrigger} />
  ) : null;
};

export default OrbitLine;
