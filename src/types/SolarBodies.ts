import { Vector3 } from "@react-three/fiber";
import { OrbitalParams } from "./Orbit";
import * as THREE from "three";
import Satellite from "../components/Moon";
import { ReactElement } from "react";

export interface PlanetData {
  name: string;
  scale: number;
  orbit?: OrbitalParams;
  texture_path: string;
  centrePosition?: THREE.Vector3;
  children?: ReactElement<typeof Satellite>;
}

export interface EarthProps {
  children?: ReactElement<typeof Satellite>;
  orbit?: OrbitalParams;
  centrePosition?: THREE.Vector3;
}

export interface SatelliteProps {
  planetPosition?: THREE.Vector3;
  orbit?: OrbitalParams;
}