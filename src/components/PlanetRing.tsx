import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame } from '@react-three/fiber';

export interface SaturnRingProps {
    texturePath: string;
    innerRadius: number;
    outerRadius: number;
    planetPosition?: THREE.Vector3;
}

const SaturnRing: React.FC<SaturnRingProps> = (
    { texturePath, innerRadius, outerRadius, 
        planetPosition = new THREE.Vector3(0, 0, 0), 
    }) => {
    const ringRef = useRef<THREE.Mesh>(null);
    const texture = useLoader(THREE.TextureLoader, texturePath);
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
    const v3 = new THREE.Vector3();

    for (let i = 0; i < geometry.attributes.position.count; i++) {
        v3.fromBufferAttribute(geometry.attributes.position, i);
        geometry.attributes.uv.setXY(i, v3.length() < (innerRadius + outerRadius) / 2 ? 0 : 1, 1);
    }

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xaaaaaa, // Changed color to be less bright
        side: THREE.DoubleSide,
        transparent: true
    });

    useFrame(() => {
        if (ringRef.current) {
            ringRef.current.position.copy(planetPosition);
        }
    });

    return (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
            <primitive object={geometry} attach="geometry" />
            <primitive object={material} attach="material" />
        </mesh>
    );
};

export default SaturnRing;