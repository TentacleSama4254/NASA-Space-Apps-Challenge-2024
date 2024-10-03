import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedRigidBodies } from "@react-three/rapier";
import { Vector3 } from "three";

import {
  calculateInitialPosition,
  calculateOrbitalPosition,
} from "../config/planetCalculations";
import { useTrails } from "../context/Trails";

import Planet from "./Planet";

// Planets component
const Planets = ({ count = 2 }) => {
  const { addTrailPoint } = useTrails();

  const planetsRef = useRef();
  const [planetCount, setPlanetCount] = useState(count);

  // Define orbital parameters for each planet
  const orbitalParams = useMemo(() => {
    const params = [];
    for (let i = 0; i < count; i++) {
      const a = 10 + Math.random() * 20; // Semi-major axis
      const e = Math.random() * 0.5; // Eccentricity
      const T = 10 + Math.random() * 20; // Orbital period
      params.push({ a, e, T });
    }
    return params;
  }, [count]);

  // Set up the initial planet data
  const planetData = useMemo(() => {
    const planets = [];
    for (let i = 0; i < count; i++) {
      const key = "instance_" + Math.random();
      const position = calculateInitialPosition();
      const scale = 0.5 + Math.random() * 1.5;

      planets.push({
        key,
        position,
        scale,
        userData: { type: "Planet", key },
      });
    }
    return planets;
  }, [count]);

  // Update the planet count
  useEffect(() => {
    setPlanetCount(planetsRef.current.length);
  }, [planetsRef.current]);

  // Animate planets in elliptical orbits
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    planetsRef.current?.forEach((planet, index) => {
      const { a, e, T } = orbitalParams[index];
      const position = calculateOrbitalPosition(a, e, T, t);
      planet.setTranslation(position);

      addTrailPoint(
        planet.userData.key,
        new Vector3(position.x, position.y, position.z)
      );
    });
  });

  return (
    <InstancedRigidBodies
      ref={planetsRef}
      instances={planetData}
      colliders="ball"
    >
      <Planet count={planetCount} />
    </InstancedRigidBodies>
  );
};

export default Planets;