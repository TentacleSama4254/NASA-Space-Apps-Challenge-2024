import * as THREE from 'three';

export interface OrbitalParams {
  a: number;
  e: number;
  inclination: number;
  omega: number;
  raan: number;
  q: number;
}

export interface PlanetaryAttributes {
  key: string;
  position: THREE.Vector3;
  scale: number;
  userData: {
    type: string;
    key: string;
  };
}