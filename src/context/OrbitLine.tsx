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

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { propagate } from '../utils/planetCalculations';
import { OrbitalParams } from '../types';
import { getOrbitPath } from '../domain/ephemerisService';
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
}

const OrbitLine: React.FC<OrbitLineProps> = ({
  orbitalParams,
  centrePosition,
  planetRef,
  isFocused,
  periodDays = 365,
  bodyId,
}) => {
  const simClock = useSimClock();
  const orbitRef = useRef<THREE.Line | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);

  useEffect(() => {
    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Try ephemeris orbit path first ────────────────────────────────────────
    if (bodyId) {
      const ephPoints = getOrbitPath(bodyId, simTimeMs);
      if (ephPoints && ephPoints.length >= 3) {
        const geometry = new THREE.BufferGeometry().setFromPoints(ephPoints);
        const material = new THREE.LineBasicMaterial({
          color: 0x888888,
          transparent: true,
        });
        orbitRef.current = new THREE.Line(geometry, material);
        setRenderTrigger((n) => n + 1);
        return;
      }
    }

    // ── Keplerian fallback ─────────────────────────────────────────────────────
    const NUM_POINTS = 1000;
    const periodSec  = periodDays * 86400;

    // Sample one full orbit centred on the current simulation time.
    const secFromJ2000 = (simTimeMs - J2000_UNIX_MS) / 1000;
    const halfPeriod   = periodSec / 2;

    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= NUM_POINTS; i++) {
      const offset = -halfPeriod + (i / NUM_POINTS) * periodSec;
      const pos = propagate(
        secFromJ2000 + offset,
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
          centrePosition.x + pos.x,
          centrePosition.y + pos.y,
          centrePosition.z + pos.z,
        ),
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true });
    orbitRef.current = new THREE.Line(geometry, material);
    setRenderTrigger((n) => n + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbitalParams, centrePosition, periodDays, bodyId]);

  useEffect(() => {
    setRenderTrigger((n) => n + 1);
  }, [isFocused]);

  useFrame(({ camera }) => {
    if (!orbitRef.current || !planetRef.current) return;

    const material = orbitRef.current.material as THREE.LineBasicMaterial;
    const dist = camera.position.distanceTo(planetRef.current.position);

    material.opacity = THREE.MathUtils.clamp(
      1.0 - (dist / 4000) * (1.0 - 0.08),
      0.08,
      1.0,
    );
    material.transparent = true;
    material.color.set(isFocused ? 0xffffff : 0x888888);
  });

  return orbitRef.current ? (
    <primitive object={orbitRef.current} key={renderTrigger} />
  ) : null;
};

export default OrbitLine;
