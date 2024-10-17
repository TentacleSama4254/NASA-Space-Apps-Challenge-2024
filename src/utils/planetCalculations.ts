import { Vector3 } from 'three'
import { SUN_RADIUS, SUN_MASS, SPAWN_RADIUS, GRAVITATIONAL_CONSTANT, SUN_OFFSET } from '../config/constants'
import * as THREE from 'three';

// Get random position either within the spawn radius or on the outside edge
export const calculateInitialPosition = (isEntry = false) => {
    const theta = Math.random() * Math.PI * 2
    const radius = isEntry ? SPAWN_RADIUS * 1.5 : Math.random() * SPAWN_RADIUS + SUN_RADIUS * 3
    const x = Math.cos(theta) * radius
    const y = Math.random() * 10
    const z = Math.sin(theta) * radius
    return new Vector3(x, y, z)
}

// Calculate the initial velocity of the planet
interface Position {
  x: number;
  y: number;
  z: number;
}

interface Velocity extends Position {}

export const calculateInitialVelocity = (position: Vector3, respawn: boolean): Vector3 => {
  const radialVector = new Vector3().copy(position)
  const distance = radialVector.length()
  const orbitalSpeed = Math.sqrt((GRAVITATIONAL_CONSTANT * SUN_MASS) / distance)
  const upVector = new Vector3(0, 1, 0)
  const velocity = new Vector3().crossVectors(radialVector, upVector).normalize().multiplyScalar(orbitalSpeed).multiplyScalar(20000)

  if (respawn) {
    velocity.multiplyScalar(0.75)
  }

  return velocity
}

export const calculateOrbitalPosition = (a:number, e:number, T:number, t:number) => {
  const meanAnomaly = (2 * Math.PI / T) * t;
  let eccentricAnomaly = meanAnomaly;

  // Solve Kepler's equation iteratively
  for (let i = 0; i < 5; i++) {
    eccentricAnomaly = meanAnomaly + e * Math.sin(eccentricAnomaly);
  }

  const x = a * (Math.cos(eccentricAnomaly) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly);

  return new Vector3(x, y, 0);
};


// Keplerian orbital propagation functions translated to JavaScript
const KeplerStart3 = (e:number, M:number) => {
  const t34 = e ** 2;
  const t35 = e * t34;
  const t33 = Math.cos(M);

  return (
    M + ((-1 / 2) * t35 + e + (t34 + (3 / 2) * t33 * t35) * t33) * Math.sin(M)
  );
};

const eps3 = (e:number, M:number, x:number) => {
  const t1 = Math.cos(x);
  const t2 = -1 + e * t1;
  const t3 = Math.sin(x);
  const t4 = e * t3;
  const t5 = -x + t4 + M;
  const t6 = t5 / (((1 / 2) * t5 * t4) / t2 + t2);
  return t5 / (((1 / 2) * t3 - (1 / 6) * t1 * t6) * e * t6 + t2);
};

export const KeplerSolve = (e:number, M:number) => {
  const tol = 1.0e-14;
  const Mnorm = M % (2 * Math.PI);
  let E0 = KeplerStart3(e, Mnorm);
  let dE = tol + 1;
  let count = 0;

  while (dE > tol) {
    const E = E0 - eps3(e, Mnorm, E0);
    dE = Math.abs(E - E0);
    E0 = E;
    count += 1;

    if (count === 100) {
      console.error("Astounding! KeplerSolve failed to converge!");
      break;
    }
  }

  return E0;
};

export const propagate = (
  clock: number,
  a: number,
  e: number,
  inclination: number,
  omega: number,
  raan: number,
  heliocentric = true,
  Period?: number
): THREE.Vector3 => {
  const T = Period??120; // seconds AND DEPENDS ON THE ORBITAL PERIOD
  const n = (2 * Math.PI) / T;
  const tau = 0; // time of pericenter passage

  const M = n * (clock - tau);
  const E = KeplerSolve(e, M);
  const cose = Math.cos(E);

  const r = a * (1 - e * cose);
  const s_x = r * ((cose - e) / (1 - e * cose));
  const s_y = r * ((Math.sqrt(1 - e ** 2) * Math.sin(E)) / (1 - e * cose));
  const s_z = 0;

  // Apply rotations (pitch, yaw, roll)
  const point = heliocentric? new THREE.Vector3(s_x, s_y, s_z).add(SUN_OFFSET): new THREE.Vector3(s_x, s_y, s_z);
  point.applyAxisAngle(new THREE.Vector3(0, 1, 0), inclination); // Pitch
  point.applyAxisAngle(new THREE.Vector3(0, 0, 1), omega); // Yaw
  point.applyAxisAngle(new THREE.Vector3(1, 0, 0), raan+90); // Roll

  return point;
};