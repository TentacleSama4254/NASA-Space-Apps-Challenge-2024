import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

const AxesHelper = () => {
  const { scene } = useThree();
  const axesRef = useRef<THREE.AxesHelper>(null);

  useEffect(() => {
    if (axesRef.current) {
      scene.add(axesRef.current);
    }
    return () => {
      if (axesRef.current) {
        scene.remove(axesRef.current);
      }
    };
  }, [scene]);

  return <axesHelper ref={axesRef} args={[10000]} position={[0, 0, 0]} />;
};

export default AxesHelper;
