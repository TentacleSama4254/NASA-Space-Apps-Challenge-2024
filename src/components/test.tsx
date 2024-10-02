import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import Globe from "globe.gl";
import * as THREE from "three";

const Earth: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!globeRef.current) return;

    const globeContainer = document.createElement("div");
    const world = Globe({ animateIn: false })(globeContainer)
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
      globeRef.current?.add(clouds);
    });

    globeRef.current?.add(world.scene());
  }, []);

  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += (-0.006 * Math.PI) / 180;
    }
  });

  return (
    <group ref={globeRef}>
      {/* The globe will be attached to this group */}
    </group>
  );
};

export default Earth;
