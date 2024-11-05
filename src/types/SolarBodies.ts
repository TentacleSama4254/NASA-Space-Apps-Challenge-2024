import { Vector3 } from "@react-three/fiber";
import * as THREE from "three";
import Satellite from "../components/Moon";
import { ReactElement } from "react";

export interface PlanetDataType {
  name: string;
  diameter: number;
  // distanceFromSun: number;
  period: number; // Orbital period in Earth days (converted to seconds in the code)
  position?: Vector3|number[];
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

/**
 * Interface representing the orbital parameters.
 */
export interface OrbitalParams {
  /**
   * Semi-major axis (a) of the orbit.
   */
  a: number;
  /**
   * Eccentricity (e) of the orbit.
   */
  e: number;
  /**
   * Inclination of the orbit in degrees.
   */
  inclination: number;
  /**
   * Argument of periapsis (omega) in degrees.
   */
  omega: number;
  /**
   * Right ascension of the ascending node (RAAN) in degrees.
   */
  raan: number;
}