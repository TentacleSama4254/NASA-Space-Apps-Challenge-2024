import { Vector3 } from "@react-three/fiber";
import { OrbitalParams } from "./Orbit";

export interface PlanetData {
  name: string;
  position: Vector3;
  scale: number;
  orbit?: OrbitalParams;
  texture_path: string;
      
}