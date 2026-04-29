import * as THREE from 'three';
import { J2000_UNIX_MS } from '../config/constants';
import type { BodyDefinition } from './types';

const TWO_PI = Math.PI * 2;

export function hoursToSeconds(hours: number): number {
  return hours * 3600;
}

export function rotationAngleAtTime(
  rotationPeriodHours: number | undefined,
  simTimeMs: number,
  phaseDeg = 0,
): number {
  if (!rotationPeriodHours || rotationPeriodHours === 0) return 0;

  const elapsedSec = (simTimeMs - J2000_UNIX_MS) / 1000;
  const periodSec = hoursToSeconds(Math.abs(rotationPeriodHours));
  const direction = rotationPeriodHours < 0 ? -1 : 1;
  const phase = THREE.MathUtils.degToRad(phaseDeg);
  return phase + direction * ((elapsedSec / periodSec) * TWO_PI);
}

export function axialTiltRad(bodyDef: BodyDefinition | undefined): number {
  return THREE.MathUtils.degToRad(bodyDef?.rotation?.axialTiltDeg ?? 0);
}

export function applyBodyRotation(
  spinObject: THREE.Object3D,
  tiltObject: THREE.Object3D | null,
  bodyDef: BodyDefinition | undefined,
  simTimeMs: number,
): void {
  const rotation = bodyDef?.rotation;
  if (tiltObject) {
    tiltObject.rotation.set(0, 0, axialTiltRad(bodyDef));
  }

  spinObject.rotation.y = rotationAngleAtTime(
    rotation?.periodHours,
    simTimeMs,
    rotation?.phaseDeg ?? 0,
  );
}
