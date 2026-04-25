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
import { J2000_UNIX_MS } from '../config/constants';
import { useCamera } from '../context/Camera';

// ─── Constants ────────────────────────────────────────────────────────────────

const EARTH_DEF = BODIES.earth;
export const earthSize = PlanetData.earth.diameter / 2;

/** Distance at which cloud/night/normal/specular maps are loaded. */
const DETAIL_THRESHOLD = 0.85;

// ─── Texture paths ────────────────────────────────────────────────────────────

const DAY_MAP      = '/textures/8k_earth_daymap.jpg';
const NIGHT_MAP    = '/textures/8k_earth_nightmap.jpg';
const CLOUDS_MAP   = '/textures/8k_earth_clouds.jpg';
const NORMAL_MAP   = '/textures/8k_earth_normal_map.jpg';
const SPECULAR_MAP = '/textures/8k_earth_specular_map.jpg';

const EarthBaseTexture: React.FC<{
  earthRef: React.RefObject<THREE.Mesh | null>;
}> = ({ earthRef }) => {
  const [colourMap] = useLoader(TextureLoader, [DAY_MAP]);

  useEffect(() => {
    if (!earthRef.current) return;
    const mat = earthRef.current.material as THREE.MeshStandardMaterial;
    mat.map = colourMap;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
  }, [earthRef, colourMap]);

  return null;
};

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
  }, [earthRef, cloudRef, lightsRef, normalMap, specularMap, cloudsMap, lightsMap]);

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
  const cameraContext = useCamera();
  const handleFocus = cameraContext ? cameraContext.handleFocus : () => {};
  const focusedObject = cameraContext ? cameraContext.focusedObject : null;

  const groupRef  = useRef<THREE.Group | null>(null);
  const earthRef  = useRef<THREE.Mesh | null>(null);
  const cloudRef  = useRef<THREE.Mesh | null>(null);
  const lightsRef = useRef<THREE.Mesh | null>(null);
  const meshRef   = useRef<THREE.InstancedMesh>(null);

  const [tagOpacity, setTagOpacity]   = useState(1);
  const [loadBaseTexture, setLoadBaseTexture] = useState(false);
  const [showDetail, setShowDetail]   = useState(false);
  const [segments, setSegments]       = useState(32);
  const opacityRef = useRef(tagOpacity);
  const didAutoFocus = useRef(false);

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
    if (!groupRef.current || !earthRef.current) return;

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

    groupRef.current.position.copy(absPos);

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
    const nextOpacity = dist < 1000 ? Math.max(0, (dist - 500) / 500) : 1;
    if (Math.abs(nextOpacity - opacityRef.current) > 0.05) {
      opacityRef.current = nextOpacity;
      setTagOpacity(nextOpacity);
    }
    if (dist < 2 && !loadBaseTexture) setLoadBaseTexture(true);
    if (dist < DETAIL_THRESHOLD && loadBaseTexture && !showDetail) setShowDetail(true);
    const newSegs = dist < DETAIL_THRESHOLD ? 132 : dist < 2000 ? 64 : 32;
    if (newSegs !== segments) setSegments(newSegs);

    if (!didAutoFocus.current) {
      didAutoFocus.current = true;
      handleFocus({ object: groupRef.current });
    }
  });

  useEffect(() => {
    globalRefs.push(groupRef);
    return () => {
      const idx = globalRefs.indexOf(groupRef);
      if (idx !== -1) globalRefs.splice(idx, 1);
    };
  }, []);

  const focusEarth = () => {
    if (groupRef.current) handleFocus({ object: groupRef.current });
  };

  const isFocused = focusedObject?.object === groupRef.current;

  return (
    <>
      <group ref={groupRef} userData={{ diameter: PlanetData.earth.diameter }}>
        <instancedMesh
          userData={{ type: 'Earth' }}
          type="kinematicPosition"
          args={[undefined, undefined, 1]}
          ref={meshRef}
          onClick={(event) => {
            event.stopPropagation();
            focusEarth();
          }}
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
            <meshStandardMaterial color={EARTH_DEF.textures.placeholder} />
          </mesh>
        </instancedMesh>

        {loadBaseTexture && (
          <Suspense fallback={null}>
            <EarthBaseTexture earthRef={earthRef} />
          </Suspense>
        )}

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
          position={[0, 0, 0]}
          label="Earth"
          dotColor={EARTH_DEF.labelColor}
          opacity={tagOpacity}
          onClick={focusEarth}
          occlude={globalRefs.filter((r) => r !== groupRef)}
        />

        {/* Moon is a local child of Earth's moving group. */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(
              child as React.ReactElement<{ planetPosition: THREE.Vector3 }>,
              { planetPosition: groupRef.current?.position ?? new THREE.Vector3() },
            );
          }
          return child;
        })}
      </group>

      {/* Earth's orbit is world-space and must not inherit Earth's transform. */}
      <OrbitLine
        orbitalParams={orbitalParams}
        centrePosition={centrePosition}
        planetRef={groupRef}
        isFocused={isFocused}
        periodDays={periodDays}
        bodyId="earth"
      />
    </>
  );
};

export default Earth;
