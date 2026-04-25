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

import React, { useEffect, useMemo, useRef } from 'react';
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
  const distanceRef = useRef(4000);
  const planetWorldPosition = useRef(new THREE.Vector3());
  const nearestOrbitPoint = useRef(new THREE.Vector3());
  const anchoredLinePosition = useRef(new THREE.Vector3());

  const orbitData = useMemo(() => {
    const makeSmoothLine = (sourcePoints: THREE.Vector3[], isClosed = true) => {
      const targetPointCount = isFocused ? 4096 : 2048;
      const curve = new THREE.CatmullRomCurve3(
        sourcePoints,
        isClosed,
        'centripetal',
        0.35,
      );
      const smoothPoints = curve.getPoints(targetPointCount);
      const geometry = new THREE.BufferGeometry().setFromPoints(smoothPoints);
      const material = new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
      });
      return new THREE.Line(geometry, material);
    };

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Try ephemeris orbit path first ────────────────────────────────────────
    if (bodyId) {
      const ephPoints = getOrbitPath(bodyId, simTimeMs);
      if (ephPoints && ephPoints.length >= 3) {
        const maxPoints = isFocused ? 720 : 360;
        const stride = Math.max(1, Math.ceil(ephPoints.length / maxPoints));
        const sampled = ephPoints.filter((_, index) => index % stride === 0);
        return {
          line: makeSmoothLine(sampled),
          basePosition: new THREE.Vector3(),
        };
      }
    }

    // ── Keplerian fallback ─────────────────────────────────────────────────────
    const NUM_POINTS = isFocused ? 720 : 360;
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
          pos.x,
          pos.y,
          pos.z,
        ),
      );
    }

    return {
      line: makeSmoothLine(points),
      basePosition: centrePosition.clone(),
    };
  // simClock is a ref-backed service; changes should not rebuild geometry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bodyId,
    isFocused,
    orbitalParams.a,
    orbitalParams.e,
    orbitalParams.inclination,
    orbitalParams.omega,
    orbitalParams.raan,
    periodDays,
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

    if (isFocused) {
      const positionAttribute = orbitRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      let nearestDistanceSq = Infinity;

      for (let i = 0; i < positionAttribute.count; i += 1) {
        nearestOrbitPoint.current.fromBufferAttribute(positionAttribute, i);
        nearestOrbitPoint.current.add(orbitData.basePosition);
        const distanceSq = nearestOrbitPoint.current.distanceToSquared(planetWorldPosition.current);
        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq;
          anchoredLinePosition.current.copy(nearestOrbitPoint.current);
        }
      }

      orbitRef.current.position.copy(orbitData.basePosition);
      orbitRef.current.position.add(
        planetWorldPosition.current.clone().sub(anchoredLinePosition.current),
      );
    } else {
      orbitRef.current.position.copy(orbitData.basePosition);
    }
  });

  return <primitive object={orbitData.line} />;
};

export default OrbitLine;
