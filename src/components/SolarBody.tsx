/* eslint-disable react-hooks/immutability -- three.js textures/materials are mutable GPU resources. */

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { PlanetDataType, SatelliteProps } from '../types';
import { propagate } from '../utils/planetCalculations';
import OrbitLine from '../context/OrbitLine';
import { SaturnRingProps } from './PlanetRing';
import { globalRefs } from '../context/GlobalRefs';
import PlanetLabel from './PlanetLabel';
import { BODIES } from '../domain/bodyRegistry';
import { getBodyPosition } from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS } from '../config/constants';
import { useCamera } from '../context/Camera';

// ─── Geometry detail thresholds ───────────────────────────────────────────────

/** Camera distance below which high-res geometry segments are used. */
const CLOSE_DISTANCE = 600;

function segmentCount(distToCamera: number): number {
  if (distToCamera < CLOSE_DISTANCE) return 64;
  if (distToCamera < 3000) return 32;
  return 16;
}

// ─── Venus atmosphere overlay (separate component to avoid conditional hook) ──

interface AtmosphereProps {
  texturePath: string;
  diameter: number;
  meshRef: React.RefObject<THREE.Mesh | null>;
}

const AtmosphereLayer: React.FC<AtmosphereProps> = ({ texturePath, diameter, meshRef }) => {
  const { gl } = useThree();
  const [map] = useLoader(TextureLoader, [texturePath]);

  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    map.needsUpdate = true;
  }, [map, gl]);

  return (
    <mesh ref={meshRef as React.RefObject<THREE.Mesh>}>
      <sphereGeometry args={[diameter / 2, 32, 32]} />
      <meshPhongMaterial
        map={map}
        transparent
        depthWrite={true}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// ─── Main planet component ────────────────────────────────────────────────────

const Planet: React.FC<PlanetDataType> = ({
  name,
  diameter,
  orbit,
  texture_path,
  texture_path1,
  children,
  period,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const simClock = useSimClock();
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;
  const { gl } = useThree();

  // Look up the body definition for registry-driven data.
  const bodyId = name.toLowerCase();
  const bodyDef = BODIES[bodyId];
  const labelColor = bodyDef?.labelColor ?? 'turquoise';

  const textureSrc = bodyDef?.textures.low ?? texture_path ?? '/textures/8k_mercury.jpg';
  const [surfaceMap] = useLoader(TextureLoader, [textureSrc]);

  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [tagOpacity, setTagOpacity] = useState(1);
  const [segments, setSegments] = useState(16);
  const [loadDetails, setLoadDetails] = useState(false);
  const opacityRef = useRef(tagOpacity);

  const defaultOrbit = {
    a: 5000,
    e: 0.5,
    inclination: 0,
    omega: 0,
    raan: 0,
    q: 10,
  };
  const orbitalParams = orbit ?? defaultOrbit;

  // Keplerian fallback clock offset for ma0-corrected mean anomaly.
  const keplerian = bodyDef?.keplerianElements;
  const periodDays = bodyDef?.periodDays ?? (period ?? 365);
  const periodSec = periodDays * 86400;
  const ma0Deg = keplerian?.ma0 ?? 0;

  useEffect(() => {
    surfaceMap.colorSpace = THREE.SRGBColorSpace;
    surfaceMap.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    surfaceMap.needsUpdate = true;
  }, [surfaceMap, gl]);

  useFrame(({ clock: r3fClock, camera }) => {
    if (!groupRef.current || !planetRef.current) return;

    // ── Simulation time ──────────────────────────────────────────────────────
    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position (ephemeris → fallback Keplerian) ────────────────────────────
    const ephemerisPos = getBodyPosition(bodyId, simTimeMs);

    if (ephemerisPos) {
      groupRef.current.position.copy(ephemerisPos);
    } else {
      // Fallback: Keplerian propagation from J2000 epoch with ma0 offset.
      const secFromJ2000 = (simTimeMs - J2000_UNIX_MS) / 1000;
      const ma0OffsetSec = (ma0Deg / 360) * periodSec;
      const kepClock = secFromJ2000 + ma0OffsetSec;

      const pos = propagate(
        kepClock,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        periodSec,
      );
      const absPos = new THREE.Vector3(
        centrePosition.x + pos.x,
        centrePosition.y + pos.y,
        centrePosition.z + pos.z,
      );
      groupRef.current.position.copy(absPos);
    }

    // ── Self-rotation (use real elapsed time for smooth spin) ────────────────
    planetRef.current.rotation.y = r3fClock.getElapsedTime() / 6;

    // ── Camera distance → label opacity + geometry LOD ───────────────────────
    const dist = camera.position.distanceTo(groupRef.current.position);
    const nextOpacity = dist < 1000 ? Math.max(0, (dist - 500) / 500) : 1;
    if (Math.abs(nextOpacity - opacityRef.current) > 0.05) {
      opacityRef.current = nextOpacity;
      setTagOpacity(nextOpacity);
    }
    const newSegs = segmentCount(dist);
    if (newSegs !== segments) setSegments(newSegs);
    const textureDistance = Math.max(diameter * 50, 2);
    if (!loadDetails && dist < textureDistance) setLoadDetails(true);
  });

  useEffect(() => {
    globalRefs.push(groupRef);
    return () => {
      globalRefs.splice(globalRefs.indexOf(groupRef), 1);
    };
  }, []);

  const focusThisBody = () => {
    if (groupRef.current) {
      setLoadDetails(true);
      handleFocus({ object: groupRef.current });
    }
  };

  const isFocused = focusedObject?.object === groupRef.current;
  const shouldLoadDetails = loadDetails || isFocused;

  return (
    <>
      <group ref={groupRef} userData={{ diameter }}>
        <mesh
          ref={planetRef}
          userData={{ diameter }}
          onClick={(event) => {
            event.stopPropagation();
            focusThisBody();
          }}
        >
          <sphereGeometry args={[diameter / 2, segments, segments]} />
          <meshPhongMaterial map={surfaceMap} color={0xffffff} />
        </mesh>

        {/* Venus atmosphere overlay — deferred until the planet is focused/nearby */}
        {shouldLoadDetails && texture_path1 && (
          <Suspense fallback={null}>
            <AtmosphereLayer
              texturePath={texture_path1}
              diameter={diameter}
              meshRef={atmosphereRef}
            />
          </Suspense>
        )}

        <PlanetLabel
          position={[0, 0, 0]}
          label={name}
          dotColor={labelColor}
          opacity={tagOpacity}
          onClick={focusThisBody}
          occlude={globalRefs
            .filter((ref) => ref !== groupRef && ref !== atmosphereRef)
            .filter(Boolean)}
        />

        {/* Rings/moons are local children of the moving planet group. */}
        {shouldLoadDetails && React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(
              child as
                | React.ReactElement<SatelliteProps>
                | React.ReactElement<SaturnRingProps>,
              {
                planetPosition: groupRef.current?.position ?? new THREE.Vector3(),
              },
            );
          }
          return child;
        })}
      </group>

      {/* Orbits are world-space siblings, not children of the moving body. */}
      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centrePosition}
        planetRef={groupRef}
        isFocused={isFocused}
        periodDays={periodDays}
        bodyId={bodyId}
      />
    </>
  );
};

export default Planet;
