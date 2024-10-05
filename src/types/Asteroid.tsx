import { Vector3 } from "@react-three/fiber";
import { OrbitalParams } from "./Orbit";

export interface AsteroidData {
  key: string;
  position: Vector3;
  scale: number;
  userData: {
    type: string;
    key: string;
  };
    orbit: OrbitalParams;
    count : number;         //temp
}