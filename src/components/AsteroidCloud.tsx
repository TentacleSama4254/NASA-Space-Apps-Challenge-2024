import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCamera } from '../context/Camera';
import { useSimClock } from '../context/SimulationClock';
import { SUN_OFFSET } from '../config/constants';
import { fetchAsteroidCatalog, fetchCloseApproaches } from '../domain/smallBodyService';
import type { AsteroidCatalogKind, CloseApproach, SmallBodyOrbit } from '../domain/smallBodies';
import { writeSmallBodyPosition } from '../domain/smallBodies';
import { rotationAngleAtTime } from '../domain/rotation';

export interface AsteroidLayerToggles {
  mainBelt: boolean;
  nearEarth: boolean;
  pha: boolean;
  closeApproaches: boolean;
}

interface AsteroidCatalogState {
  mainBelt: SmallBodyOrbit[];
  neo: SmallBodyOrbit[];
  pha: SmallBodyOrbit[];
  closeApproaches: CloseApproach[];
  loading: boolean;
}

const INITIAL_CATALOG_STATE: AsteroidCatalogState = {
  mainBelt: [],
  neo: [],
  pha: [],
  closeApproaches: [],
  loading: true,
};

const POINT_COLORS = {
  mainBelt: new THREE.Color('#9dccff'),
  neo: new THREE.Color('#a6ffd9'),
  pha: new THREE.Color('#ffd97a'),
  close: new THREE.Color('#ff786d'),
};

const WIDE_ASTEROID_POINT_SIZE = 4.8;
const INSPECT_ASTEROID_POINT_SIZE = 0.18;
const WIDE_ASTEROID_OPACITY = 0.88;
const INSPECT_ASTEROID_OPACITY = 0.025;
const ASTEROID_WORLD_RADIUS_MIN = 0.012;
const ASTEROID_WORLD_RADIUS_MAX = 0.08;

const scratchFocusPosition = new THREE.Vector3();

function labelFor(body: SmallBodyOrbit): string {
  return body.name || body.designation;
}

function designationKey(value: string): string {
  return value.trim().toLowerCase();
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number): () => number {
  let next = seed;
  return () => {
    next = Math.imul(1664525, next) + 1013904223;
    return (next >>> 0) / 4294967296;
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function focusedBodyInspectionFactor(
  camera: THREE.Camera,
  focusedObject: { object: THREE.Object3D } | null | undefined,
): number {
  const object = focusedObject?.object;
  if (!object || object.userData?.type === 'asteroid') return 0;

  object.getWorldPosition(scratchFocusPosition);
  const diameter = typeof object.userData?.diameter === 'number' ? object.userData.diameter : 0;
  const radius = Math.max(diameter / 2, 0.02);
  const radiusDistance = camera.position.distanceTo(scratchFocusPosition) / radius;
  return 1 - smoothstep(34, 110, radiusDistance);
}

function makeAsteroidGeometry(body: SmallBodyOrbit, radius: number): THREE.BufferGeometry {
  const random = randomFromSeed(hashString(body.designation));
  const geometry = new THREE.IcosahedronGeometry(radius, 1);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  const stretch = new THREE.Vector3(
    0.82 + random() * 0.55,
    0.64 + random() * 0.42,
    0.78 + random() * 0.48,
  );

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const lump = 0.78 + random() * 0.45;
    vertex.multiply(stretch).multiplyScalar(lump);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function useAsteroidCatalog(): AsteroidCatalogState {
  const [state, setState] = useState(INITIAL_CATALOG_STATE);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      const [mainBelt, neo, pha, closeApproaches] = await Promise.all([
        fetchAsteroidCatalog('main-belt', 60_000),
        fetchAsteroidCatalog('neo', 25_000),
        fetchAsteroidCatalog('pha', 5_000),
        fetchCloseApproaches(365, 0.08),
      ]);

      if (!active) return;
      setState({
        mainBelt,
        neo,
        pha,
        closeApproaches,
        loading: false,
      });
    }

    load().catch((error) => {
      console.warn('[asteroids] Unable to load asteroid layers.', error);
      if (active) setState((current) => ({ ...current, loading: false }));
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

function makeCircleSpriteTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Texture();

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.96)');
  gradient.addColorStop(0.78, 'rgba(255,255,255,0.36)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addCatalog(
  map: Map<string, SmallBodyOrbit>,
  catalog: SmallBodyOrbit[],
  _kind: AsteroidCatalogKind,
): void {
  catalog.forEach((body) => {
    map.set(designationKey(body.designation), body);
  });
}

function useVisibleAsteroids(
  catalog: AsteroidCatalogState,
  toggles: AsteroidLayerToggles,
): {
  bodies: SmallBodyOrbit[];
  closeApproachMap: Map<string, CloseApproach>;
} {
  return useMemo(() => {
    const map = new Map<string, SmallBodyOrbit>();
    const closeApproachMap = new Map<string, CloseApproach>();

    catalog.closeApproaches.forEach((approach) => {
      closeApproachMap.set(designationKey(approach.designation), approach);
    });

    if (toggles.mainBelt) addCatalog(map, catalog.mainBelt, 'main-belt');
    if (toggles.nearEarth) addCatalog(map, catalog.neo, 'neo');
    if (toggles.pha) addCatalog(map, catalog.pha, 'pha');

    if (toggles.closeApproaches) {
      [...catalog.neo, ...catalog.pha].forEach((body) => {
        if (closeApproachMap.has(designationKey(body.designation))) {
          map.set(designationKey(body.designation), body);
        }
      });
    }

    return {
      bodies: [...map.values()],
      closeApproachMap,
    };
  }, [catalog, toggles]);
}

interface PromotedAsteroidProps {
  body: SmallBodyOrbit;
  closeApproach?: CloseApproach;
  showLabel: boolean;
}

const PromotedAsteroid: React.FC<PromotedAsteroidProps> = ({
  body,
  closeApproach,
  showLabel,
}) => {
  const simClock = useSimClock();
  const cameraContext = useCamera();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useRef(new Float32Array(3));
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const radius = THREE.MathUtils.clamp(
    Math.cbrt(body.diameterKm ?? 0.5) * 0.018,
    ASTEROID_WORLD_RADIUS_MIN,
    ASTEROID_WORLD_RADIUS_MAX,
  );
  const geometry = useMemo(() => makeAsteroidGeometry(body, radius), [body, radius]);
  const baseColor = closeApproach ? '#a28f86' : body.pha ? '#9d9586' : '#8f9290';

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();
    writeSmallBodyPosition(body, simTimeMs, position.current, 0);
    groupRef.current.position.set(position.current[0], position.current[1], position.current[2]);
    if (meshRef.current && body.rotationPeriodHours) {
      meshRef.current.rotation.y = rotationAngleAtTime(body.rotationPeriodHours, simTimeMs);
    }
    if (materialRef.current) {
      const inspectFactor = focusedBodyInspectionFactor(camera, cameraContext?.focusedObject);
      materialRef.current.opacity = THREE.MathUtils.lerp(0.88, 0.42, inspectFactor);
    }
  });

  return (
    <group ref={groupRef} userData={{ diameter: radius * 2, type: 'asteroid' }}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        userData={{ diameter: radius * 2, type: 'asteroid' }}
        onClick={(event) => {
          event.stopPropagation();
          if (groupRef.current) cameraContext?.handleFocus({ object: groupRef.current });
        }}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={baseColor}
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.88}
        />
      </mesh>
      {showLabel && (
        <Html position={[0, radius * 2.8, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              color: '#f7f7f7',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 6px rgba(0,0,0,0.95)',
            }}
          >
            {labelFor(body)}
            {closeApproach ? ` · ${closeApproach.distanceLd.toFixed(1)} LD` : ''}
          </div>
        </Html>
      )}
    </group>
  );
};

interface AsteroidCloudProps {
  toggles: AsteroidLayerToggles;
  onStatsChange?: (stats: { visible: number; loading: boolean }) => void;
}

const AsteroidCloud: React.FC<AsteroidCloudProps> = ({ toggles, onStatsChange }) => {
  const catalog = useAsteroidCatalog();
  const simClock = useSimClock();
  const { bodies, closeApproachMap } = useVisibleAsteroids(catalog, toggles);
  const pointsRef = useRef<THREE.Points>(null);
  const pointsMaterialRef = useRef<THREE.PointsMaterial>(null);
  const lastUpdate = useRef(0);
  const circleTexture = useMemo(() => makeCircleSpriteTexture(), []);
  const cameraContext = useCamera();

  const geometry = useMemo(() => {
    const positions = new Float32Array(Math.max(1, bodies.length) * 3);
    const colors = new Float32Array(Math.max(1, bodies.length) * 3);
    const initialTimeMs = Date.now();

    bodies.forEach((body, index) => {
      writeSmallBodyPosition(body, initialTimeMs, positions, index * 3);
      const approach = closeApproachMap.get(designationKey(body.designation));
      const color = approach
        ? POINT_COLORS.close
        : body.pha
          ? POINT_COLORS.pha
          : body.neo
            ? POINT_COLORS.neo
            : POINT_COLORS.mainBelt;

      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });

    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    next.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 90_000);
    return next;
  }, [bodies, closeApproachMap]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      circleTexture.dispose();
    };
  }, [circleTexture]);

  useEffect(() => {
    onStatsChange?.({ visible: bodies.length, loading: catalog.loading });
  }, [bodies.length, catalog.loading, onStatsChange]);

  useFrame(({ camera }) => {
    const inspectFactor = focusedBodyInspectionFactor(camera, cameraContext?.focusedObject);
    if (pointsMaterialRef.current) {
      pointsMaterialRef.current.size = THREE.MathUtils.lerp(
        WIDE_ASTEROID_POINT_SIZE,
        INSPECT_ASTEROID_POINT_SIZE,
        inspectFactor,
      );
      pointsMaterialRef.current.opacity = THREE.MathUtils.lerp(
        WIDE_ASTEROID_OPACITY,
        INSPECT_ASTEROID_OPACITY,
        inspectFactor,
      );
      const nextBlending =
        inspectFactor > 0.16 ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (pointsMaterialRef.current.blending !== nextBlending) {
        pointsMaterialRef.current.blending = nextBlending;
        pointsMaterialRef.current.needsUpdate = true;
      }
    }

    const now = performance.now();
    if (now - lastUpdate.current < 220) return;
    lastUpdate.current = now;

    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;

    bodies.forEach((body, index) => {
      writeSmallBodyPosition(body, simTimeMs, positions, index * 3);
    });

    attribute.needsUpdate = true;
  });

  const promoted = useMemo(() => {
    const ranked = bodies
      .filter((body) => body.pha || closeApproachMap.has(designationKey(body.designation)))
      .sort((a, b) => {
        const aApproach = closeApproachMap.get(designationKey(a.designation));
        const bApproach = closeApproachMap.get(designationKey(b.designation));
        if (aApproach && bApproach) return aApproach.distanceAu - bApproach.distanceAu;
        if (aApproach) return -1;
        if (bApproach) return 1;
        return (b.diameterKm ?? 0) - (a.diameterKm ?? 0);
      });
    return ranked.slice(0, 72);
  }, [bodies, closeApproachMap]);

  return (
    <group position={[SUN_OFFSET.x, SUN_OFFSET.y, SUN_OFFSET.z]}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          ref={pointsMaterialRef}
          map={circleTexture}
          alphaTest={0.02}
          size={WIDE_ASTEROID_POINT_SIZE}
          sizeAttenuation
          vertexColors
          transparent
          opacity={WIDE_ASTEROID_OPACITY}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {promoted.map((body, index) => {
        const closeApproach = closeApproachMap.get(designationKey(body.designation));
        return (
          <PromotedAsteroid
            key={`${body.designation}-${index}`}
            body={body}
            closeApproach={closeApproach}
            showLabel={index < 12}
          />
        );
      })}
    </group>
  );
};

export default AsteroidCloud;
