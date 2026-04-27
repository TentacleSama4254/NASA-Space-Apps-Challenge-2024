import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCamera } from '../context/Camera';
import { useSimClock } from '../context/SimulationClock';
import { fetchAsteroidCatalog, fetchCloseApproaches } from '../domain/smallBodyService';
import type { AsteroidCatalogKind, CloseApproach, SmallBodyOrbit } from '../domain/smallBodies';
import { writeSmallBodyPosition } from '../domain/smallBodies';

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
  mainBelt: new THREE.Color('#7fb4ff'),
  neo: new THREE.Color('#8dfac9'),
  pha: new THREE.Color('#ffcf6d'),
  close: new THREE.Color('#ff6b5a'),
};

function labelFor(body: SmallBodyOrbit): string {
  return body.name || body.designation;
}

function designationKey(value: string): string {
  return value.trim().toLowerCase();
}

function useAsteroidCatalog(): AsteroidCatalogState {
  const [state, setState] = useState(INITIAL_CATALOG_STATE);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      const [mainBelt, neo, pha, closeApproaches] = await Promise.all([
        fetchAsteroidCatalog('main-belt', 20_000),
        fetchAsteroidCatalog('neo', 8_000),
        fetchAsteroidCatalog('pha', 2_500),
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
  gradient.addColorStop(0.36, 'rgba(255,255,255,0.88)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.24)');
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
  const position = useRef(new Float32Array(3));
  const color = closeApproach ? '#ff6b5a' : body.pha ? '#ffcf6d' : '#8dfac9';
  const radius = Math.max(0.45, Math.min(2.2, (body.diameterKm ?? 0.6) * 0.04));

  useFrame(() => {
    if (!groupRef.current) return;
    const simTimeMs = simClock?.getSimTimeMs() ?? Date.now();
    writeSmallBodyPosition(body, simTimeMs, position.current, 0);
    groupRef.current.position.set(position.current[0], position.current[1], position.current[2]);
  });

  return (
    <group ref={groupRef} userData={{ diameter: radius * 2 }}>
      <mesh
        userData={{ diameter: radius * 2 }}
        onClick={(event) => {
          event.stopPropagation();
          if (groupRef.current) cameraContext?.handleFocus({ object: groupRef.current });
        }}
      >
        <sphereGeometry args={[radius, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      {showLabel && (
        <Html position={[0, radius * 2.8, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              color: '#f7f7f7',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 8px rgba(0,0,0,0.95)',
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
  const lastUpdate = useRef(0);
  const circleTexture = useMemo(() => makeCircleSpriteTexture(), []);

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

  useFrame(() => {
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
    <>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          map={circleTexture}
          alphaTest={0.02}
          size={4.2}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.68}
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
    </>
  );
};

export default AsteroidCloud;
