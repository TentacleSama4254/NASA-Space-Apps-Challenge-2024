import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
// import Globe from "globe.gl";
import Globe from "react-globe.gl";
import * as THREE from "three";

const Earth: React.FC = () => {
  const globeEl = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!globeEl.current) return;

    const world = Globe({ animateIn: false })(globeEl.current)
      .globeImageUrl(
        "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      )
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png");

    // Auto-rotate
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.35;

    // Add clouds sphere
    const CLOUDS_IMG_URL = "./clouds.png"; // from https://github.com/turban/webgl-earth
    const CLOUDS_ALT = 0.004;

    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(
          world.getGlobeRadius() * (1 + CLOUDS_ALT),
          75,
          75
        ),
        new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
      );
      cloudsRef.current = clouds;
      world.scene().add(clouds);
    });
  }, []);

  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += (-0.006 * Math.PI) / 180;
    }
  });

  return (
    <mesh ref={globeEl as any}>
      {/* The globe will be attached to this mesh */}
    </mesh>
  );
};
//test commit for contributions
export default Earth;
