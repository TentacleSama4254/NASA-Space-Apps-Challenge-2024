/**
 * Asteroid
 *
 * Renders a single asteroid using real JPL orbital elements (a, e, i, om, w)
 * converted from AU/degrees to scene units.  The clock is driven by the
 * shared simulation clock so asteroids advance at the same rate as planets.
 *
 * Mean anomaly at the asteroid's tabulated epoch is preserved so the body
 * starts at its correct orbital phase relative to J2000.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { propagate } from '../utils/planetCalculations';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS, DISTANCE_SCALE_KM } from '../config/constants';

/** 1 AU in km — used to convert asteroid semi-major axes. */
const AU_KM = 1.495978707e8;

export interface AsteroidProps {
  name: string;
  /** Apparent diameter for the HTML dot (purely visual, scaled by the caller). */
  diameter: number;
  orbit: {
    /** Semi-major axis in AU */
    aAU: number;
    e: number;
    /** Inclination in degrees */
    i: number;
    /** Longitude of ascending node in degrees */
    om: number;
    /** Argument of perihelion in degrees */
    w: number;
    /** Mean anomaly at epoch in degrees */
    ma: number;
    /** Epoch as Julian date */
    epochJd: number;
  };
  /** Orbital period in days (derived from Kepler's 3rd law: T=a^1.5 years) */
  periodDays: number;
  centrePosition?: THREE.Vector3;
}

/** Julian date → Unix ms */
function jdToUnixMs(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

const Asteroid: React.FC<AsteroidProps> = ({
  name,
  diameter,
  orbit,
  periodDays,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const simClock = useSimClock();
  const asteroidRef = useRef<THREE.Group>(null);

  const periodSec  = periodDays * 86400;
  const epochUnixMs = jdToUnixMs(orbit.epochJd);

  // Convert AU → scene units for semi-major axis.
  const aScene = (orbit.aAU * AU_KM) / DISTANCE_SCALE_KM;

  useFrame(() => {
    if (!asteroidRef.current) return;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // Compute the effective propagation clock so that mean anomaly is correct
    // at the asteroid's tabulated epoch.
    //   M(t) = ma_epoch + n*(t - epoch)
    // propagate() computes M = n*clock with tau=0, so:
    //   clock = (simTime - epoch)/1 + (ma_epoch/360)*period
    const secFromEpoch  = (simTimeMs - epochUnixMs) / 1000;
    const ma0OffsetSec  = (orbit.ma / 360) * periodSec;
    const propClock     = secFromEpoch + ma0OffsetSec;

    const pos = propagate(
      propClock,
      aScene,
      orbit.e,
      orbit.i,   // already in degrees; propagate() converts internally
      orbit.w,
      orbit.om,
      false,
      periodSec,
    );

    asteroidRef.current.position.set(
      centrePosition.x + pos.x,
      centrePosition.y + pos.y,
      centrePosition.z + pos.z,
    );
  });

  return (
    <group ref={asteroidRef}>
      {/* Simple dot representation — no HTML overlay to keep draw calls low */}
      <mesh>
        <sphereGeometry args={[Math.max(0.5, diameter * 0.0001), 4, 4]} />
        <meshBasicMaterial color="#89d3fa" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

export default Asteroid;
