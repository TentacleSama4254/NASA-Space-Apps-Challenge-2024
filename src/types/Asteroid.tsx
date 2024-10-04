import { OrbitalParams } from "./Orbit";

export interface AsteroidData {
  key: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  scale: number;
  userData: {
    type: string;
    key: string;
  };
    orbit: OrbitalParams;
    count : number;         //temp
}