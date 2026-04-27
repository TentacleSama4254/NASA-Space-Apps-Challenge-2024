/**
 * Moon (Satellite)
 *
 * Renders Earth's Moon with a physically-based orbit.  Position is driven by
 * the JPL Horizons geocentric ephemeris; Keplerian propagation around the
 * Earth's ephemeris/fallback position is used while data loads.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitalParams, SatelliteProps } from '../types';
import { propagate } from '../utils/planetCalculations';
import OrbitLine from '../context/OrbitLine';
import { BODIES, EPHEMERIS_BODY_IDS } from '../domain/bodyRegistry';
import {
  getBodyPositionRelativeToParent,
  loadEphemerisForBody,
} from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS } from '../config/constants';
import { useCamera } from '../context/Camera';
import { useProgressiveTexture } from '../hooks/useProgressiveTexture';
import PlanetLabel from './PlanetLabel';
import { globalRefs } from '../context/GlobalRefs';

const MIN_VISIBLE_MOON_RADIUS = 0.01;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number): () => number {
  let next = seed;
  return () => {
    next = Math.imul(1664525, next) + 1013904223;
    return ((next >>> 0) / 4294967296);
  };
}

function makeProceduralMoonTexture(bodyId: string, baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const seed = hashString(bodyId);
  const random = randomFromSeed(seed);
  const base = new THREE.Color(baseColor);

  ctx.fillStyle = base.getStyle();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const latitudeShade = 0.84 + Math.sin((y / canvas.height) * Math.PI) * 0.22;
      const grain = 0.8 + random() * 0.42;
      const color = base.clone().multiplyScalar(latitudeShade * grain);
      ctx.fillStyle = color.getStyle();
      ctx.fillRect(x, y, 1, 1);
    }
  }

  for (let i = 0; i < 42; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 1.5 + random() * 9;
    const shade = random() > 0.45 ? 1.22 : 0.55;
    const color = base.clone().multiplyScalar(shade);
    const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    gradient.addColorStop(0, color.getStyle());
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

const Satellite: React.FC<SatelliteProps> = ({
  bodyId = 'moon',
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
  const usesPhotoTexture = bodyDef.id === 'moon';
  const { texture: moonMap } = useProgressiveTexture({
    lowSrc: usesPhotoTexture ? bodyDef.textures.low : null,
    highSrc: usesPhotoTexture ? bodyDef.textures.high : null,
    loadHigh: isFocused,
  });
  const proceduralMap = useMemo(
    () => usesPhotoTexture ? null : makeProceduralMoonTexture(bodyDef.id, bodyDef.textures.placeholder),
    [bodyDef.id, bodyDef.textures.placeholder, usesPhotoTexture],
  );
  const surfaceMap = moonMap ?? proceduralMap;

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
    if ((EPHEMERIS_BODY_IDS as readonly string[]).includes(bodyDef.id)) {
      loadEphemerisForBody(bodyDef.id);
    }
  }, [bodyDef.id]);

  useEffect(() => {
    globalRefs.push(groupRef);
    return () => {
      const idx = globalRefs.indexOf(groupRef);
      if (idx !== -1) globalRefs.splice(idx, 1);
    };
  }, []);

  useEffect(() => () => {
    proceduralMap?.dispose();
  }, [proceduralMap]);

  useFrame(({ clock: r3fClock, camera }) => {
    if (!groupRef.current || !moonRef.current) return;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position (ephemeris → fallback) ───────────────────────────────────────
    const ephPos = getBodyPositionRelativeToParent(bodyDef.id, simTimeMs);

    if (ephPos) {
      groupRef.current.position.copy(ephPos);
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
            map={surfaceMap ?? undefined}
            color={surfaceMap ? 0xffffff : bodyDef.textures.placeholder}
          />
        </instancedMesh>

        <PlanetLabel
          position={[0, visualRadius * 1.65, 0]}
          label={bodyDef.name}
          dotColor={bodyDef.labelColor}
          opacity={tagOpacity}
          onClick={focusMoon}
        />
      </group>

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={new THREE.Vector3(0, 0, 0)}
        planetRef={groupRef}
        isFocused={isFocused}
        periodDays={periodDays}
        bodyId={bodyDef.id}
        relativeToParent
        meanAnomalyDeg={kep.ma0 ?? 0}
      />
    </>
  );
};

export default Satellite;
