/**
 * Moon (Satellite)
 *
 * Renders Earth's Moon with a physically-based orbit.  Position is driven by
 * the JPL Horizons geocentric ephemeris; Keplerian propagation around the
 * Earth's ephemeris/fallback position is used while data loads.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitalParams, SatelliteProps } from '../types';
import { propagate } from '../utils/planetCalculations';
import OrbitLine from '../context/OrbitLine';
import { BODIES } from '../domain/bodyRegistry';
import { getBodyPosition, loadEphemerisForBody } from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS } from '../config/constants';
import { useCamera } from '../context/Camera';
import { useProgressiveTexture } from '../hooks/useProgressiveTexture';
import PlanetLabel from './PlanetLabel';
import { globalRefs } from '../context/GlobalRefs';

const MIN_VISIBLE_MOON_RADIUS = 0.01;

const Satellite: React.FC<SatelliteProps> = ({
  bodyId = 'moon',
  planetPosition = new THREE.Vector3(0, 0, 0),
  orbit,
}) => {
  const bodyDef = BODIES[bodyId] ?? BODIES.moon;
  const simClock = useSimClock();
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;

  const groupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.InstancedMesh>(null);
  const worldPositionRef = useRef(new THREE.Vector3());
  const opacityRef = useRef(1);
  const [tagOpacity, setTagOpacity] = useState(1);
  const isFocused = focusedObject?.object === groupRef.current;
  const { texture: moonMap } = useProgressiveTexture({
    lowSrc: bodyDef.textures.low,
    highSrc: bodyDef.textures.high,
    loadHigh: isFocused,
  });

  const kep = bodyDef.keplerianElements!;
  const periodDays = bodyDef.periodDays!;
  const periodSec  = periodDays * 86400;
  const visualRadius = Math.max(bodyDef.radiusKm / 100000, MIN_VISIBLE_MOON_RADIUS);

  const orbitalParams: OrbitalParams = orbit ?? {
    a: kep.a,
    e: kep.e,
    inclination: kep.inclination,
    omega: kep.omega,
    raan: kep.raan,
  };

  useEffect(() => {
    loadEphemerisForBody(bodyDef.id);
  }, [bodyDef.id]);

  useEffect(() => {
    globalRefs.push(groupRef);
    return () => {
      const idx = globalRefs.indexOf(groupRef);
      if (idx !== -1) globalRefs.splice(idx, 1);
    };
  }, []);

  useFrame(({ clock: r3fClock, camera }) => {
    if (!groupRef.current || !moonRef.current) return;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position (ephemeris → fallback) ───────────────────────────────────────
    const ephPos = getBodyPosition(bodyDef.id, simTimeMs);

    if (ephPos) {
      const parentPos =
        (bodyDef.parentId ? getBodyPosition(bodyDef.parentId, simTimeMs) : null) ??
        planetPosition;
      groupRef.current.position.copy(ephPos.clone().sub(parentPos));
    } else {
      // Fallback: satellites are nested under their parent moving group.
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
    }

    moonRef.current.rotation.y = (r3fClock.getElapsedTime() / 6) * 0.037;

    groupRef.current.getWorldPosition(worldPositionRef.current);
    const dist = camera.position.distanceTo(worldPositionRef.current);
    const nextOpacity = dist < 55 ? 1 : Math.max(0, 1 - (dist - 55) / 80);
    if (Math.abs(nextOpacity - opacityRef.current) > 0.05) {
      opacityRef.current = nextOpacity;
      setTagOpacity(nextOpacity);
    }
  });

  const focusMoon = () => {
    if (groupRef.current) {
      handleFocus({ object: groupRef.current });
    }
  };

  return (
    <>
      <group ref={groupRef} userData={{ diameter: visualRadius * 2 }}>
        <instancedMesh
          userData={{ type: bodyDef.name }}
          type="kinematicPosition"
          args={[undefined, undefined, 1]}
          ref={moonRef}
          onClick={(event) => {
            event.stopPropagation();
            focusMoon();
          }}
        >
          <ambientLight intensity={0.03} />
          <sphereGeometry args={[visualRadius, 32, 32]} />
          <meshStandardMaterial
            map={moonMap ?? undefined}
            color={moonMap ? 0xffffff : bodyDef.textures.placeholder}
          />
        </instancedMesh>

        <PlanetLabel
          position={[0, visualRadius * 1.65, 0]}
          label={bodyDef.name}
          dotColor={bodyDef.labelColor}
          opacity={tagOpacity}
          onClick={focusMoon}
          occlude={globalRefs.filter((ref) => ref !== groupRef)}
        />
      </group>

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={new THREE.Vector3(0, 0, 0)}
        planetRef={groupRef}
        isFocused={isFocused}
        periodDays={periodDays}
        meanAnomalyDeg={kep.ma0 ?? 0}
      />
    </>
  );
};

export default Satellite;
