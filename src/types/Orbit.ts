import * as THREE from 'three';


export interface PlanetData {
  key: string;
  position: THREE.Vector3;
  scale: number;
  userData: {
    type: string;
    key: string;
  };
}