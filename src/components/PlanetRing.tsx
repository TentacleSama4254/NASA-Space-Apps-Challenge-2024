import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

export interface SaturnRingProps {
    texturePath: string;
    innerRadius: number;
    outerRadius: number;
    planetPosition?: THREE.Vector3;
}

const SaturnRing: React.FC<SaturnRingProps> = (
    { texturePath, innerRadius, outerRadius }) => {
    const texture = useLoader(THREE.TextureLoader, texturePath);

    const geometry = useMemo(() => {
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 96);
        const v3 = new THREE.Vector3();

        for (let i = 0; i < ringGeometry.attributes.position.count; i++) {
            v3.fromBufferAttribute(ringGeometry.attributes.position, i);
            ringGeometry.attributes.uv.setXY(
                i,
                v3.length() < (innerRadius + outerRadius) / 2 ? 0 : 1,
                1,
            );
        }

        return ringGeometry;
    }, [innerRadius, outerRadius]);

    const material = useMemo(() => new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xaaaaaa,
        side: THREE.DoubleSide,
        transparent: true,
    }), [texture]);

    return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            <primitive object={geometry} attach="geometry" />
            <primitive object={material} attach="material" />
        </mesh>
    );
};

export default SaturnRing;