import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
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
import { J2000_UNIX_MS, SUN_OFFSET } from '../config/constants';

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
  const [map] = useLoader(TextureLoader, [texturePath]);
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
  const cameraRef = useRef<THREE.Camera | null>(null);

  // Look up the body definition for registry-driven data.
  const bodyId = name.toLowerCase();
  const bodyDef = BODIES[bodyId];
  const labelColor = bodyDef?.labelColor ?? 'turquoise';

  // Always load the base texture unconditionally (no conditional hooks).
  const textureSrc = bodyDef?.textures.low ?? texture_path ?? '/textures/8k_mercury.jpg';
  const [planetMap] = useLoader(TextureLoader, [textureSrc]);

  const planetRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [tagOpacity, setTagOpacity] = useState(1);
  const [planetPosition, setPlanetPosition] = useState([0, 0, 0]);
  const [segments, setSegments] = useState(16);

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

  useFrame(({ clock: r3fClock, camera }) => {
    if (!planetRef.current) return;

    cameraRef.current = camera;

    // ── Simulation time ──────────────────────────────────────────────────────
    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position (ephemeris → fallback Keplerian) ────────────────────────────
    const ephemerisPos = getBodyPosition(bodyId, simTimeMs);

    if (ephemerisPos) {
      planetRef.current.position.copy(ephemerisPos);
      atmosphereRef.current?.position.copy(ephemerisPos);
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
      planetRef.current.position.copy(absPos);
      atmosphereRef.current?.position.copy(absPos);
    }

    // ── Self-rotation (use real elapsed time for smooth spin) ────────────────
    planetRef.current.rotation.y = r3fClock.getElapsedTime() / 6;

    // ── Camera distance → label opacity + geometry LOD ───────────────────────
    const dist = camera.position.distanceTo(planetRef.current.position);
    setTagOpacity(dist < 1000 ? Math.max(0, (dist - 500) / 500) : 1);
    const newSegs = segmentCount(dist);
    if (newSegs !== segments) setSegments(newSegs);

    setPlanetPosition(planetRef.current.position.toArray());
  });

  useEffect(() => {
    globalRefs.push(planetRef);
    return () => {
      globalRefs.splice(globalRefs.indexOf(planetRef), 1);
    };
  }, []);

  return (
    <group>
      <mesh ref={planetRef} userData={{ diameter }}>
        <sphereGeometry args={[diameter / 2, segments, segments]} />
        <meshPhongMaterial map={planetMap} />
      </mesh>

      {/* Venus atmosphere overlay — always rendered via a stable sub-component */}
      {texture_path1 && (
        <Suspense fallback={null}>
          <AtmosphereLayer
            texturePath={texture_path1}
            diameter={diameter}
            meshRef={atmosphereRef}
          />
        </Suspense>
      )}

      <PlanetLabel
        position={planetPosition}
        label={name}
        dotColor={labelColor}
        opacity={tagOpacity}
        occlude={globalRefs
          .filter((ref) => ref !== planetRef && ref !== atmosphereRef)
          .filter(Boolean)}
      />

      {/* Pass the current mesh position down to child components (rings, moons) */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as
              | React.ReactElement<SatelliteProps>
              | React.ReactElement<SaturnRingProps>,
            {
              planetPosition: planetRef.current?.position ?? new THREE.Vector3(),
            },
          );
        }
        return child;
      })}

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centrePosition}
        planetRef={planetRef}
        isFocused={isFocused}
        periodDays={periodDays}
        bodyId={bodyId}
      />
    </group>
  );
};

export default Planet;
