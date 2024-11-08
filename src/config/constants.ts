import { earthSize } from "../components/Earth"
import * as THREE from "three"

export const GRAVITATIONAL_CONSTANT = 6.6743e-11
export const SCALE_FACTOR = 0.0001

export const SPAWN_RADIUS = 250

export const SUN_RADIUS = 30
// Calculate the suns mass from its radius, rounded to 2 decimal places
export const SUN_MASS = Math.round((4 / 3) * Math.PI * Math.pow(SUN_RADIUS, 3) * 1410) / 100

export const SUN_OFFSET = new THREE.Vector3(4000, 0, 0)

export const SOLAR_MASS = 1.989e30; // kg
export const SOLAR_GRAVITATIONAL_PARAMETER = GRAVITATIONAL_CONSTANT * SOLAR_MASS; // m^3 s^-2
