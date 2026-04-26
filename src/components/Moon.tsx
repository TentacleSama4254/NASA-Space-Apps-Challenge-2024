/**
 * Moon (Satellite)
 *
 * Renders Earth's Moon with a physically-based orbit.  Position is driven by
 * the JPL Horizons geocentric ephemeris; Keplerian propagation around the
 * Earth's ephemeris/fallback position is used while data loads.
 */

/* eslint-disable react-hooks/immutability -- three.js textures/materials are mutable GPU resources. */

import React, { useEffect, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { OrbitalParams, SatelliteProps } from '../types';
import { propagate } from '../utils/planetCalculations';
import { earthSize } from './Earth';
import OrbitLine from '../context/OrbitLine';
import { BODIES } from '../domain/bodyRegistry';
import { getBodyPosition } from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS } from '../config/constants';
import { useCamera } from '../context/Camera';

const MOON_DEF = BODIES.moon;

const Satellite: React.FC<SatelliteProps> = ({
  planetPosition = new THREE.Vector3(0, 0, 0),
  orbit,
}) => {
  const simClock = useSimClock();
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;
  const { gl } = useThree();
  const [moonMap] = useLoader(TextureLoader, [MOON_DEF.textures.low]);

  const groupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.InstancedMesh>(null);
  const centreRef = useRef(planetPosition.clone());

  const kep = MOON_DEF.keplerianElements!;
  const periodDays = MOON_DEF.periodDays!;
  const periodSec  = periodDays * 86400;

  const orbitalParams: OrbitalParams = orbit ?? {
    a: kep.a,
    e: kep.e,
    inclination: kep.inclination,
    omega: kep.omega,
    raan: kep.raan,
  };

  useEffect(() => {
    moonMap.colorSpace = THREE.SRGBColorSpace;
    moonMap.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    moonMap.needsUpdate = true;
  }, [moonMap, gl]);

  useFrame(({ clock: r3fClock }) => {
    if (!groupRef.current || !moonRef.current) return;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position (ephemeris → fallback) ───────────────────────────────────────
    const ephPos = getBodyPosition('moon', simTimeMs);

    if (ephPos) {
      const earthPos = getBodyPosition('earth', simTimeMs) ?? planetPosition;
      groupRef.current.position.copy(ephPos.clone().sub(earthPos));
      centreRef.current.set(0, 0, 0);
    } else {
      // Fallback: Moon is nested under Earth's moving group, so use local coords.
      const secFromJ2000 = (simTimeMs - J2000_UNIX_MS) / 1000;
      const ma0OffsetSec = ((kep.ma0 ?? 0) / 360) * periodSec;
      const localPos = propagate(
        secFromJ2000 + ma0OffsetSec,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        periodSec,
      );
      groupRef.current.position.copy(localPos);
      centreRef.current.set(0, 0, 0);
    }

    moonRef.current.rotation.y = (r3fClock.getElapsedTime() / 6) * 0.037;
  });

  const focusMoon = () => {
    if (groupRef.current) {
      handleFocus({ object: groupRef.current });
    }
  };

  const isFocused = focusedObject?.object === groupRef.current;

  return (
    <>
      <group ref={groupRef} userData={{ diameter: earthSize * 0.54 }}>
        <instancedMesh
          userData={{ type: 'Moon' }}
          type="kinematicPosition"
          args={[undefined, undefined, 1]}
          ref={moonRef}
          onClick={(event) => {
            event.stopPropagation();
            focusMoon();
          }}
        >
          <ambientLight intensity={0.03} />
          <sphereGeometry args={[earthSize * 0.27, 32, 32]} />
          <meshStandardMaterial map={moonMap} color={0xffffff} />
        </instancedMesh>
      </group>

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centreRef.current}
        planetRef={groupRef}
        isFocused={isFocused}
        periodDays={periodDays}
      />
    </>
  );
};

export default Satellite;
