import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const SKY_RADIUS = 90000;
const SKY_DOME_RADIUS = 22000;
const NEAR_STAR_RADIUS = 18000;
const STAR_COUNT = 12000;
const NEAR_STAR_COUNT = 900;
const CLUSTER_COUNT = 6;
const CLUSTER_STARS = 260;

const SKY_VERTEX_SHADER = `
  uniform float uZoomResponse;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(position);
    vDirection = normalize(mix(direction, normalize(direction + vec3(0.04, -0.025, 0.018)), uZoomResponse * 0.28));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform float uZoomResponse;
  varying vec3 vDirection;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amp;
      p *= 2.13;
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    vec3 bandNormal = normalize(vec3(0.31, 0.78, -0.54));
    vec3 galacticCore = normalize(vec3(-0.74, 0.08, -0.67));

    float planeDistance = abs(dot(dir, bandNormal));
    float broadBand = smoothstep(0.24, 0.0, planeDistance);
    float innerBand = smoothstep(0.075, 0.0, planeDistance);
    float core = pow(max(dot(dir, galacticCore), 0.0), 9.0);

    float clouds = fbm(dir * 5.2 + vec3(2.0, 6.0, 1.0));
    float detail = fbm(dir * 18.0 + vec3(8.0, 1.5, 4.0));
    float dustLane = smoothstep(0.028, 0.0, planeDistance) * smoothstep(0.42, 0.9, detail);

    float zoomLift = mix(0.82, 1.18, uZoomResponse);
    float glow = broadBand * (0.08 + clouds * 0.17) + innerBand * 0.075 + core * 0.32;
    glow *= 1.0 - dustLane * 0.55;
    glow *= zoomLift;

    vec3 coolHaze = vec3(0.22, 0.34, 0.62);
    vec3 warmCore = vec3(0.78, 0.58, 0.38);
    vec3 violetDust = vec3(0.38, 0.24, 0.56);
    vec3 color = mix(coolHaze, violetDust, clouds * 0.45);
    color = mix(color, warmCore, core * 0.8);

    float alpha = clamp(glow, 0.0, mix(0.13, 0.2, uZoomResponse));
    gl_FragColor = vec4(color * glow * 1.45, alpha);
  }
`;

const STAR_VERTEX_SHADER = `
  uniform float uZoomResponse;
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * mix(0.86, 1.22, uZoomResponse);
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    if (radius > 0.5) discard;

    float glow = smoothstep(0.5, 0.02, radius);
    float core = smoothstep(0.16, 0.0, radius);
    vec3 color = vColor * (0.72 + core * 1.8);
    gl_FragColor = vec4(color, vAlpha * glow);
  }
`;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function gaussian(random: () => number) {
  const u = Math.max(random(), 1e-8);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomDirection(random: () => number) {
  const z = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(Math.max(0, 1 - z * z));
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    z,
    Math.sin(angle) * radius,
  );
}

function directionNear(base: THREE.Vector3, random: () => number, spread: number) {
  const tangent = randomDirection(random).cross(base).normalize();
  const bitangent = base.clone().cross(tangent).normalize();
  const offset = tangent
    .multiplyScalar(gaussian(random) * spread)
    .add(bitangent.multiplyScalar(gaussian(random) * spread));
  return base.clone().add(offset).normalize();
}

function pushStar(
  direction: THREE.Vector3,
  random: () => number,
  positions: number[],
  colors: number[],
  sizes: number[],
  alphas: number[],
  clusterBoost = 0,
  radius = SKY_RADIUS,
) {
  const brightnessRoll = Math.pow(random(), 5.2);
  const rareBright = random() > 0.992;
  const twinkle = 0.76 + random() * 0.36;
  const warmthRoll = random();

  let color = new THREE.Color(0.86, 0.9, 1);
  if (warmthRoll > 0.88) color = new THREE.Color(1.0, 0.78, 0.52);
  else if (warmthRoll < 0.18) color = new THREE.Color(0.58, 0.72, 1.0);
  color.lerp(new THREE.Color(1, 1, 1), 0.36 + random() * 0.34);

  const size = (0.72 + brightnessRoll * 3.2 + (rareBright ? 2.2 : 0) + clusterBoost) * twinkle;
  const alpha = THREE.MathUtils.clamp(
    0.16 + brightnessRoll * 0.72 + (rareBright ? 0.18 : 0) + clusterBoost * 0.08,
    0.12,
    0.95,
  );

  positions.push(
    direction.x * radius,
    direction.y * radius,
    direction.z * radius,
  );
  colors.push(color.r, color.g, color.b);
  sizes.push(size);
  alphas.push(alpha);
}

function buildStarGeometry() {
  const random = seededRandom(2470429);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const alphas: number[] = [];

  for (let index = 0; index < STAR_COUNT; index += 1) {
    pushStar(randomDirection(random), random, positions, colors, sizes, alphas);
  }

  for (let cluster = 0; cluster < CLUSTER_COUNT; cluster += 1) {
    const center = randomDirection(random);
    const spread = 0.018 + random() * 0.035;

    for (let star = 0; star < CLUSTER_STARS; star += 1) {
      pushStar(
        directionNear(center, random, spread),
        random,
        positions,
        colors,
        sizes,
        alphas,
        0.15 + random() * 0.55,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function buildNearStarGeometry() {
  const random = seededRandom(88421);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const alphas: number[] = [];
  const bandNormal = new THREE.Vector3(0.31, 0.78, -0.54).normalize();

  for (let index = 0; index < NEAR_STAR_COUNT; index += 1) {
    const baseDirection = randomDirection(random);
    const towardBand = 1 - Math.abs(baseDirection.dot(bandNormal));
    if (towardBand < 0.55 && random() < 0.45) continue;

    const radius = NEAR_STAR_RADIUS * (0.65 + random() * 0.8);
    pushStar(
      baseDirection,
      random,
      positions,
      colors,
      sizes,
      alphas,
      0.35 + random() * 0.7,
      radius,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

const ProceduralStarfield = () => {
  const groupRef = useRef<THREE.Group>(null);
  const nearStarsRef = useRef<THREE.Points>(null);
  const skyMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const nearStarMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, controls } = useThree() as {
    camera: THREE.Camera;
    controls?: { target?: THREE.Vector3 };
  };
  const starGeometry = useMemo(buildStarGeometry, []);
  const nearStarGeometry = useMemo(buildNearStarGeometry, []);

  useEffect(() => () => {
    starGeometry.dispose();
    nearStarGeometry.dispose();
  }, [nearStarGeometry, starGeometry]);

  useFrame(() => {
    groupRef.current?.position.copy(camera.position);

    if (nearStarsRef.current) {
      nearStarsRef.current.position.copy(camera.position).multiplyScalar(-0.018);
    }

    const target = controls?.target;
    const focusDistance = target ? camera.position.distanceTo(target) : camera.position.length();
    const zoomResponse = 1 - smoothstep(1.2, 9000, Math.max(focusDistance, 0.001));

    if (skyMaterialRef.current) skyMaterialRef.current.uniforms.uZoomResponse.value = zoomResponse;
    if (starMaterialRef.current) starMaterialRef.current.uniforms.uZoomResponse.value = zoomResponse;
    if (nearStarMaterialRef.current) nearStarMaterialRef.current.uniforms.uZoomResponse.value = zoomResponse;
  });

  return (
    <group ref={groupRef}>
      <mesh frustumCulled={false} renderOrder={-1000}>
        <sphereGeometry args={[SKY_DOME_RADIUS, 128, 72]} />
        <shaderMaterial
          ref={skyMaterialRef}
          vertexShader={SKY_VERTEX_SHADER}
          fragmentShader={SKY_FRAGMENT_SHADER}
          uniforms={{ uZoomResponse: { value: 0 } }}
          side={THREE.BackSide}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>

      <points geometry={starGeometry} frustumCulled={false} renderOrder={-900}>
        <shaderMaterial
          ref={starMaterialRef}
          vertexShader={STAR_VERTEX_SHADER}
          fragmentShader={STAR_FRAGMENT_SHADER}
          uniforms={{ uZoomResponse: { value: 0 } }}
          vertexColors
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <points
        ref={nearStarsRef}
        geometry={nearStarGeometry}
        frustumCulled={false}
        renderOrder={-850}
      >
        <shaderMaterial
          ref={nearStarMaterialRef}
          vertexShader={STAR_VERTEX_SHADER}
          fragmentShader={STAR_FRAGMENT_SHADER}
          uniforms={{ uZoomResponse: { value: 0 } }}
          vertexColors
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};

export default ProceduralStarfield;
