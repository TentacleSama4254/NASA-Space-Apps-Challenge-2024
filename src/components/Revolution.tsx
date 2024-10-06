import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedRigidBodies } from "@react-three/rapier";
import { Vector3 } from "three";
import * as THREE from "three";
import {
  calculateInitialPosition,
  calculateOrbitalPosition,
} from "../utils/planetCalculations";
import { useTrails } from "../context/Trails";

import Asteroid from "./Asteroid";
import { KeplerSolve, propagate } from "../utils/planetCalculations";
import { AsteroidData } from "../types/Asteroid";
import { RigidBody } from "@react-three/rapier";
import Earth from "./Earth";
import usePosition from "../hooks/usePosition"; // Import the custom hook

// Planets component
const Revolution = () => {
  const count = 1
  const { addTrailPoint } = useTrails();

  const planetsRef = useRef<(typeof InstancedRigidBodies | null)[] | null>(null);
  const [planetCount, setPlanetCount] = useState(count);

  // Define orbital parameters for each planet
  const orbitalParams = useMemo(() => {
    const params = [];
    for (let i = 0; i < count; i++) {
      const a = 50 + Math.random() * 50; // Semi-major axis
      const e = Math.random() * 0.5; // Eccentricity
      const inclination = THREE.MathUtils.degToRad(Math.random() * 180); // Inclination in radians
      const omega = THREE.MathUtils.degToRad(Math.random() * 360); // Argument of periapsis in radians
      const raan = THREE.MathUtils.degToRad(Math.random() * 360); // Right Ascension of the Ascending Node in radians
      const q = 10 + Math.random() * 20; // Perihelion distance in AU
      params.push({ a, e, inclination, omega, raan, q });
    }
    return params;
  }, [count]);

  // Set up the initial planet data
  const planetData = useMemo(() => {
    const planets: AsteroidData[] = [];
    for (let i = 0; i < count; i++) {
      const key = "instance_" + Math.random();
      const position = calculateInitialPosition();
      const scale = 0.5 + Math.random() * 1.5;

      planets.push({
        count: 2,
        key,
        orbit: orbitalParams[i],
        scale,
        position: new THREE.Vector3(position.x, position.y, position.z),
        userData: { type: "Planet", key },
      });
    }
    return planets;
  }, [count]);

  // Initialize position state for each planet
  const [positions, updatePosition] = usePosition(new Vector3());

  // Update the planet count
  useEffect(() => {
    if (planetsRef.current) setPlanetCount(planetsRef.current.length);
  }, [planetsRef.current]);

  // Animate planets in elliptical orbits
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    planetsRef.current?.forEach((planet, index) => {
      const { a, e, inclination, omega, raan, q } = orbitalParams[index];
      const position = propagate(t, a, e, inclination, omega, raan);
      // planet.setTranslation(position);
      // planet.isMoving(true);

      updatePosition(new Vector3(position.x, position.y, position.z));
      console.log("planet", planet)
      addTrailPoint(
        planet?.userData.key,
        new Vector3(position.x, position.y, position.z)
      );
    });
  });

  return (
    <InstancedRigidBodies ref={planetsRef} instances={planetData}>
      {planetData.map((planet, index) => (
        <Earth {...planet} position={positions} />
      ))}
    </InstancedRigidBodies>
  );
};

export default Revolution;
