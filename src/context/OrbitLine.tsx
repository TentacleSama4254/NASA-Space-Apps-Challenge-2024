/**
 * OrbitLine
 *
 * Draws the elliptical orbit path for a body.  When ephemeris orbit data is
 * available (getOrbitPath) it renders the true sampled path; otherwise it
 * falls back to sampling the Keplerian propagate() function over one period.
 *
 * The period is now supplied by the caller (periodDays prop) instead of using
 * the old hard-coded 20 000-second animation loop.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { propagate } from '../utils/planetCalculations';
import { OrbitalParams } from '../types';
import {
  getOrbitPath,
  getRelativeOrbitPath,
  subscribeEphemerisLoaded,
} from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS } from '../config/constants';

interface OrbitLineProps {
  orbitalParams: OrbitalParams;
  centrePosition: THREE.Vector3;
  planetRef: React.RefObject<THREE.Object3D | null>;
  isFocused: boolean;
  /** Orbital period in Earth days — used to sample the Keplerian fallback. */
  periodDays?: number;
  /** Body id used to query the ephemeris orbit path. */
  bodyId?: string;
  /** Use parent-local ephemeris paths for nested satellites. */
  relativeToParent?: boolean;
  /** Mean anomaly at J2000, degrees, used by the Keplerian fallback. */
  meanAnomalyDeg?: number;
}

const OrbitLine: React.FC<OrbitLineProps> = ({
  orbitalParams,
  centrePosition,
  planetRef,
  isFocused,
  periodDays = 365,
  bodyId,
  relativeToParent = false,
  meanAnomalyDeg = 0,
}) => {
  const simClock = useSimClock();
  const orbitRef = useRef<THREE.Line | null>(null);
  const distanceRef = useRef(4000);
  const planetWorldPosition = useRef(new THREE.Vector3());
  const [ephemerisVersion, setEphemerisVersion] = useState(0);

  useEffect(() => {
    if (!bodyId) return undefined;
    return subscribeEphemerisLoaded((loadedBodyId) => {
      if (loadedBodyId === bodyId || (bodyId === 'moon' && loadedBodyId === 'earth')) {
        setEphemerisVersion((version) => version + 1);
      }
    });
  }, [bodyId]);

  const orbitData = useMemo(() => {
    const makeLine = (sourcePoints: THREE.Vector3[]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(sourcePoints);
      const material = new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
      });
      return new THREE.Line(geometry, material);
    };

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Try ephemeris orbit path first ────────────────────────────────────────
    if (bodyId) {
      const ephPoints = relativeToParent
        ? getRelativeOrbitPath(bodyId, simTimeMs, isFocused ? 4096 : 1440)
        : getOrbitPath(bodyId, simTimeMs, isFocused ? 4096 : 1440);
      if (ephPoints && ephPoints.length >= 3) {
        return {
          line: makeLine(ephPoints),
          basePosition: new THREE.Vector3(),
        };
      }
    }

    // ── Keplerian fallback ─────────────────────────────────────────────────────
    const NUM_POINTS = isFocused ? 4096 : 1440;
    const periodSec  = periodDays * 86400;

    // Sample one full orbit centred on the current simulation time.
    const secFromJ2000 = (simTimeMs - J2000_UNIX_MS) / 1000;
    const ma0OffsetSec = (meanAnomalyDeg / 360) * periodSec;
    const halfPeriod   = periodSec / 2;

    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= NUM_POINTS; i++) {
      const offset = -halfPeriod + (i / NUM_POINTS) * periodSec;
      const pos = propagate(
        secFromJ2000 + ma0OffsetSec + offset,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        periodSec,
      );
      points.push(
        new THREE.Vector3(
          pos.x,
          pos.y,
          pos.z,
        ),
      );
    }

    return {
      line: makeLine(points),
      basePosition: centrePosition.clone(),
    };
  // simClock is a ref-backed service; changes should not rebuild geometry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bodyId,
    ephemerisVersion,
    isFocused,
    meanAnomalyDeg,
    orbitalParams.a,
    orbitalParams.e,
    orbitalParams.inclination,
    orbitalParams.omega,
    orbitalParams.raan,
    periodDays,
    relativeToParent,
  ]);

  useEffect(() => {
    orbitRef.current = orbitData.line;
    return () => {
      orbitData.line.geometry.dispose();
      const material = orbitData.line.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
    };
  }, [orbitData]);

  useFrame(({ camera }) => {
    if (!orbitRef.current || !planetRef.current) return;

    const material = orbitRef.current.material as THREE.LineBasicMaterial;
    planetRef.current.getWorldPosition(planetWorldPosition.current);
    const dist = camera.position.distanceTo(planetWorldPosition.current);
    distanceRef.current = THREE.MathUtils.lerp(distanceRef.current, dist, 0.1);

    const focusOpacity = THREE.MathUtils.clamp(
      0.09 + (distanceRef.current / 900) * 0.56,
      0.09,
      0.65,
    );
    const backgroundOpacity = THREE.MathUtils.clamp(
      0.035 + (distanceRef.current / 6000) * 0.11,
      0.035,
      0.16,
    );

    material.opacity = isFocused ? focusOpacity : backgroundOpacity;
    material.transparent = true;
    material.color.set(isFocused ? 0xffffff : 0x6f6f6f);

    orbitRef.current.position.copy(orbitData.basePosition);
  });

  return <primitive object={orbitData.line} />;
};

export default OrbitLine;
