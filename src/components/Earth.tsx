/**
 * Earth
 *
 * Renders Earth as a textured sphere.  A separate EarthDetailLayer component
 * loads the cloud, normal, specular, and night maps and is only mounted once
 * the camera is within DETAIL_THRESHOLD scene units.  This halves the initial
 * texture load cost.
 *
 * Position is driven by the JPL Horizons ephemeris service; Keplerian
 * propagation is used as a fallback while the data is loading.
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

import { OrbitalParams } from '../types';
import { propagate } from '../utils/planetCalculations';
import OrbitLine from '../context/OrbitLine';
import { PlanetData } from '../config/SolarBodiesImport';
import PlanetLabel from './PlanetLabel';
import { globalRefs } from '../context/GlobalRefs';
import { BODIES } from '../domain/bodyRegistry';
import { getBodyPosition } from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS, SUN_OFFSET } from '../config/constants';
import { SatelliteProps } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const EARTH_DEF = BODIES.earth;
export const earthSize = PlanetData.earth.diameter / 2;

/** Distance at which cloud/night/normal/specular maps are loaded. */
const DETAIL_THRESHOLD = 500;

// ─── Texture paths ────────────────────────────────────────────────────────────

const DAY_MAP      = '/textures/8k_earth_daymap.jpg';
const NIGHT_MAP    = '/textures/8k_earth_nightmap.jpg';
const CLOUDS_MAP   = '/textures/8k_earth_clouds.jpg';
const NORMAL_MAP   = '/textures/8k_earth_normal_map.jpg';
const SPECULAR_MAP = '/textures/8k_earth_specular_map.jpg';

// ─── Detail layer (deferred until zoomed in) ──────────────────────────────────

interface DetailProps {
  earthRef: React.RefObject<THREE.Mesh | null>;
  cloudRef: React.RefObject<THREE.Mesh | null>;
  lightsRef: React.RefObject<THREE.Mesh | null>;
}

const EarthDetailLayer: React.FC<DetailProps> = ({ earthRef, cloudRef, lightsRef }) => {
  const [normalMap, specularMap, cloudsMap, lightsMap] = useLoader(TextureLoader, [
    NORMAL_MAP,
    SPECULAR_MAP,
    CLOUDS_MAP,
    NIGHT_MAP,
  ]);

  // Apply detail maps to the already-mounted Earth meshes.
  useEffect(() => {
    if (earthRef.current) {
      const mat = earthRef.current.material as THREE.MeshStandardMaterial;
      mat.normalMap  = normalMap;
      mat.needsUpdate = true;
    }
    if (cloudRef.current) {
      const mat = cloudRef.current.material as THREE.MeshPhongMaterial;
      mat.map        = cloudsMap;
      mat.needsUpdate = true;
    }
    if (lightsRef.current) {
      const mat = lightsRef.current.material as THREE.MeshPhongMaterial;
      mat.map        = lightsMap;
      mat.needsUpdate = true;
    }
  }, [normalMap, specularMap, cloudsMap, lightsMap]);

  return null;
};

// ─── Earth component ──────────────────────────────────────────────────────────

interface EarthProps {
  children?: React.ReactNode;
  orbit?: OrbitalParams;
  centrePosition?: THREE.Vector3;
}

const Earth: React.FC<EarthProps> = ({
  children,
  orbit,
  centrePosition = new THREE.Vector3(0, 0, 0),
}) => {
  const simClock = useSimClock();

  const [colourMap] = useLoader(TextureLoader, [DAY_MAP]);

  const earthRef  = useRef<THREE.Mesh | null>(null);
  const cloudRef  = useRef<THREE.Mesh | null>(null);
  const lightsRef = useRef<THREE.Mesh | null>(null);
  const meshRef   = useRef<THREE.InstancedMesh>(null);

  const [isFocused, setIsFocused]     = useState(false);
  const [planetPosition, setPlanetPosition] = useState([0, 0, 0]);
  const [tagOpacity, setTagOpacity]   = useState(1);
  const [showDetail, setShowDetail]   = useState(false);
  const [segments, setSegments]       = useState(32);

  const kep = EARTH_DEF.keplerianElements!;
  const periodDays = EARTH_DEF.periodDays!;
  const periodSec  = periodDays * 86400;
  const orbitalParams = orbit ?? {
    a: kep.a,
    e: kep.e,
    inclination: kep.inclination,
    omega: kep.omega,
    raan: kep.raan,
  };

  useFrame(({ clock: r3fClock, camera }) => {
    if (!earthRef.current) return;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();

    // ── Position ─────────────────────────────────────────────────────────────
    const ephPos = getBodyPosition('earth', simTimeMs);

    let absPos: THREE.Vector3;
    if (ephPos) {
      absPos = ephPos;
    } else {
      const secFromJ2000  = (simTimeMs - J2000_UNIX_MS) / 1000;
      const ma0OffsetSec  = ((kep.ma0 ?? 0) / 360) * periodSec;
      const pos = propagate(
        secFromJ2000 + ma0OffsetSec,
        orbitalParams.a,
        orbitalParams.e,
        orbitalParams.inclination,
        orbitalParams.omega,
        orbitalParams.raan,
        false,
        periodSec,
      );
      absPos = new THREE.Vector3(
        centrePosition.x + pos.x,
        centrePosition.y + pos.y,
        centrePosition.z + pos.z,
      );
    }

    earthRef.current.position.copy(absPos);
    cloudRef.current?.position.copy(absPos);
    lightsRef.current?.position.copy(absPos);

    // ── Self-rotation (axial tilt 23.4°, real-time spin) ─────────────────────
    const elapsedReal = r3fClock.getElapsedTime();
    const tilt = (-23.4 * Math.PI) / 180;
    earthRef.current.rotation.x = tilt;
    earthRef.current.rotation.y = elapsedReal / 6;
    if (cloudRef.current) {
      cloudRef.current.rotation.x = tilt;
      cloudRef.current.rotation.y = elapsedReal / 6;
    }
    if (lightsRef.current) {
      lightsRef.current.rotation.x = tilt;
      lightsRef.current.rotation.y = elapsedReal / 6;
    }

    // ── LOD ──────────────────────────────────────────────────────────────────
    const dist = camera.position.distanceTo(absPos);
    setTagOpacity(dist < 1000 ? Math.max(0, (dist - 500) / 500) : 1);
    if (dist < DETAIL_THRESHOLD && !showDetail) setShowDetail(true);
    const newSegs = dist < DETAIL_THRESHOLD ? 132 : dist < 2000 ? 64 : 32;
    if (newSegs !== segments) setSegments(newSegs);

    setPlanetPosition(absPos.toArray());
  });

  useEffect(() => {
    globalRefs.push(earthRef, cloudRef, lightsRef);
    return () => {
      [earthRef, cloudRef, lightsRef].forEach((r) => {
        const idx = globalRefs.indexOf(r);
        if (idx !== -1) globalRefs.splice(idx, 1);
      });
    };
  }, []);

  return (
    <group>
      <instancedMesh
        userData={{ type: 'Earth' }}
        type="kinematicPosition"
        args={[undefined, undefined, 1]}
        ref={meshRef}
      >
        <ambientLight intensity={0.03} />

        {/* Cloud layer (starts transparent until detail maps load) */}
        <mesh ref={cloudRef}>
          <sphereGeometry args={[earthSize, segments, segments]} />
          <meshPhongMaterial transparent depthWrite blending={THREE.AdditiveBlending} />
        </mesh>

        {/* Night-lights layer */}
        <mesh ref={lightsRef}>
          <sphereGeometry args={[earthSize, segments, segments]} />
          <meshPhongMaterial transparent depthWrite blending={THREE.AdditiveBlending} />
        </mesh>

        {/* Base surface — always has the day map */}
        <mesh ref={earthRef}>
          <sphereGeometry args={[earthSize, segments, segments]} />
          <meshStandardMaterial map={colourMap} />
        </mesh>
      </instancedMesh>

      {/* Load detail textures only when camera is close */}
      {showDetail && (
        <Suspense fallback={null}>
          <EarthDetailLayer
            earthRef={earthRef}
            cloudRef={cloudRef}
            lightsRef={lightsRef}
          />
        </Suspense>
      )}

      <PlanetLabel
        position={planetPosition}
        label="Earth"
        dotColor={EARTH_DEF.labelColor}
        opacity={tagOpacity}
        occlude={globalRefs.filter(
          (r) => r !== earthRef && r !== cloudRef && r !== lightsRef,
        )}
      />

      {/* Forward ephemeris-based Earth position to children (Moon, etc.) */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ planetPosition: THREE.Vector3 }>,
            { planetPosition: earthRef.current?.position ?? new THREE.Vector3() },
          );
        }
        return child;
      })}

      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centrePosition}
        planetRef={earthRef}
        isFocused={isFocused}
        periodDays={periodDays}
        bodyId="earth"
      />
    </group>
  );
};

export default Earth;
