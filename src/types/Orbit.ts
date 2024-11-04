import * as THREE from 'three';


export interface PlanetaryAttributes {
  key: string;
  position: THREE.Vector3;
  scale: number;
  userData: {
    type: string;
    key: string;
  };
}