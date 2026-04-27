/**
 * Earth
 *
 * Renders Earth as a textured sphere.  A separate EarthDetailLayer component
 * loads the cloud, normal, and night maps and is only mounted once
 * the camera is within DETAIL_THRESHOLD scene units.  This halves the initial
 * texture load cost.
 *
 * Position is driven by the JPL Horizons ephemeris service; Keplerian
 * propagation is used as a fallback while the data is loading.
 */

/* eslint-disable react-hooks/immutability -- three.js textures/materials are mutable GPU resources. */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

import { OrbitalParams } from '../types';
import { propagate } from '../utils/planetCalculations';
import OrbitLine from '../context/OrbitLine';
import { PlanetData } from '../config/SolarBodiesImport';
import PlanetLabel from './PlanetLabel';
import { globalRefs } from '../context/GlobalRefs';
import { BODIES } from '../domain/bodyRegistry';
import { getBodyPosition, loadEphemerisForBody } from '../domain/ephemerisService';
import { useSimClock } from '../context/SimulationClock';
import { J2000_UNIX_MS } from '../config/constants';
import { useCamera } from '../context/Camera';
import { useProgressiveTexture } from '../hooks/useProgressiveTexture';

// ─── Constants ────────────────────────────────────────────────────────────────

const EARTH_DEF = BODIES.earth;
export const earthSize = PlanetData.earth.diameter / 2;

/** Distance at which cloud/night/normal maps are loaded. */
const DETAIL_THRESHOLD = 0.85;

// ─── Texture paths ────────────────────────────────────────────────────────────

const DAY_MAP      = '/textures/8k_earth_daymap.jpg';
const NIGHT_MAP    = '/textures/8k_earth_nightmap.jpg';
const CLOUDS_MAP   = '/textures/8k_earth_clouds.jpg';
const NORMAL_MAP   = '/textures/8k_earth_normal_map.jpg';

// ─── Detail layer (deferred until zoomed in) ──────────────────────────────────

interface DetailProps {
  earthRef: React.RefObject<THREE.Mesh | null>;
}

const EarthDetailLayer: React.FC<DetailProps> = ({ earthRef }) => {
  const { gl } = useThree();
  const [normalMap, cloudsMap, lightsMap] = useLoader(TextureLoader, [
    NORMAL_MAP,
    CLOUDS_MAP,
    NIGHT_MAP,
  ]);

  // Apply detail maps to the already-mounted Earth meshes.
  useEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    [normalMap, cloudsMap, lightsMap].forEach((texture) => {
      texture.anisotropy = Math.min(16, maxAnisotropy);
      texture.needsUpdate = true;
    });
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    lightsMap.colorSpace = THREE.SRGBColorSpace;

    if (earthRef.current) {
      const mat = earthRef.current.material as THREE.MeshStandardMaterial;
      mat.normalMap  = normalMap;
      mat.needsUpdate = true;
    }
  }, [earthRef, gl, normalMap, cloudsMap, lightsMap]);

  return (
    <>
      <mesh>
        <sphereGeometry args={[earthSize * 1.01, 132, 132]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[earthSize * 1.002, 132, 132]} />
        <meshPhongMaterial
          map={lightsMap}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
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
  const meshRef   = useRef<THREE.InstancedMesh>(null);

  const [tagOpacity, setTagOpacity]   = useState(1);
  const [showDetail, setShowDetail]   = useState(false);
  const [segments, setSegments]       = useState(32);
  const opacityRef = useRef(tagOpacity);
  const didAutoFocus = useRef(false);
  const isFocused = focusedObject?.object === groupRef.current;
  const { texture: colourMap } = useProgressiveTexture({
    lowSrc: EARTH_DEF.textures.low,
    highSrc: DAY_MAP,
    loadHigh: showDetail || isFocused,
  });

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

  useEffect(() => {
    if (!isFocused) return;
    setShowDetail(true);
    loadEphemerisForBody('earth');
    loadEphemerisForBody('moon');
  }, [isFocused]);

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

    // ── LOD ──────────────────────────────────────────────────────────────────
    const dist = camera.position.distanceTo(absPos);
    const nextOpacity = dist < 1000 ? Math.max(0, (dist - 500) / 500) : 1;
    if (Math.abs(nextOpacity - opacityRef.current) > 0.05) {
      opacityRef.current = nextOpacity;
      setTagOpacity(nextOpacity);
    }
    if (dist < DETAIL_THRESHOLD && !showDetail) setShowDetail(true);
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
    if (groupRef.current) {
      setShowDetail(true);
      handleFocus({ object: groupRef.current });
    }
  };

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

          {/* Base surface starts low-res, then promotes to 8K while Earth is focused. */}
          <mesh ref={earthRef}>
            <sphereGeometry args={[earthSize, segments, segments]} />
            <meshStandardMaterial
              map={colourMap ?? undefined}
              color={colourMap ? 0xffffff : EARTH_DEF.textures.placeholder}
              roughness={0.82}
            />

            {/* Load detail textures only when camera is close */}
            {showDetail && (
              <Suspense fallback={null}>
                <EarthDetailLayer earthRef={earthRef} />
              </Suspense>
            )}
          </mesh>
        </instancedMesh>

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
        meanAnomalyDeg={kep.ma0 ?? 0}
      />
    </>
  );
};

export default Earth;
