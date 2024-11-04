import { Vector3 } from "@react-three/fiber";

export interface PlanetDataType {
  name: string;
  diameter: number;
  distanceFromSun: number;
  period: number; // Orbital period in Earth days (converted to seconds in the code)
  position: Vector3|number[];
  orbit?: OrbitalParams;
  texture_path: string;
      
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
  /**
   * Periapsis distance (q) of the orbit.
   */
  q: number;
}