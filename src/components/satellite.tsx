import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies } from '@react-three/rapier'
import { Vector3 } from 'three'

const Satelite = () => {
  const SatRef : any = useRef();

  return (
    <InstancedRigidBodies
      ref={SatRef}
      instances={SatData}
      colliders="ball"
      onCollisionEnter={handleCollision}
    >
      <Planet count={planetCount} />
    </InstancedRigidBodies>
  );
};

export default Satellite