import { earthSize } from "../components/Earth"
import * as THREE from "three"

export const GRAVITATIONAL_CONSTANT = 6.6743e-11
export const SCALE_FACTOR = 0.0001

export const SPAWN_RADIUS = 250

export const SUN_RADIUS = 30
// Calculate the suns mass from its radius, rounded to 2 decimal places
export const SUN_MASS = Math.round((4 / 3) * Math.PI * Math.pow(SUN_RADIUS, 3) * 1410) / 100

export const SUN_OFFSET = new THREE.Vector3(2000, 0, 0)