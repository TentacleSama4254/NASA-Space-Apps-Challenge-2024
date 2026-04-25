/**
 * Moon (Satellite)
 *
 * Renders Earth's Moon with a physically-based orbit.  Position is driven by
 * the JPL Horizons geocentric ephemeris; Keplerian propagation around the
 * Earth's ephemeris/fallback position is used while data loads.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
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

const MOON_DEF = BODIES.moon;

const Satellite: React.FC<SatelliteProps> = ({
  planetPosition = new THREE.Vector3(0, 0, 0),
  orbit,
}) => {
  const simClock = useSimClock();

  const [moonMap] = useLoader(TextureLoader, [MOON_DEF.textures.low]);

  const moonRef = useRef<THREE.InstancedMesh>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [dynamicCentrePosition, setDynamicCentrePosition] = useState(
    planetPosition.clone(),
  );

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

  useFrame(({ clock: r3fClock }) => {
    if (!moonRef.current) return;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position (ephemeris → fallback) ───────────────────────────────────────
    const ephPos = getBodyPosition('moon', simTimeMs);

    if (ephPos) {
      moonRef.current.position.copy(ephPos);
      setDynamicCentrePosition(
        (getBodyPosition('earth', simTimeMs) ?? planetPosition).clone(),
      );
    } else {
      // Fallback: propagate in Earth's local frame, then add Earth's position.
      const earthPos = getBodyPosition('earth', simTimeMs) ?? planetPosition;
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
      const absPos = earthPos.clone().add(localPos);
      moonRef.current.position.copy(absPos);
      setDynamicCentrePosition(earthPos.clone());
    }

    moonRef.current.rotation.y = (r3fClock.getElapsedTime() / 6) * 0.037;
  });

  return (
    <group>
      <instancedMesh
        userData={{ type: 'Moon' }}
        type="kinematicPosition"
        args={[undefined, undefined, 1]}
        ref={moonRef}
      >
        <ambientLight intensity={0.03} />
        <sphereGeometry args={[earthSize * 0.27, 32, 32]} />
        <meshStandardMaterial map={moonMap} />
      </instancedMesh>

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={dynamicCentrePosition}
        planetRef={moonRef}
        isFocused={isFocused}
        periodDays={periodDays}
        bodyId="moon"
      />
    </group>
  );
};

export default Satellite;
