import React, { useRef } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import noise from "./../shaders/noise.glsl";
import { SUN_OFFSET, SUN_RADIUS } from "../config/constants";
import { useCamera } from "../context/Camera";
import * as THREE from "three";


declare global {
  namespace JSX {
    interface IntrinsicElements {
      customShaderMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        ref?: React.Ref<any>;
        emissiveIntensity?: number;
        time?: number;
      };
    }
  }
}

interface SunProps {
  children?: React.ReactNode;
  position?: THREE.Vector3;
}

const Sun: React.FC<SunProps> = ({
  children,
  position = SUN_OFFSET,
}) => {
  const { handleFocus } = useCamera() as any;

  const CustomShaderMaterial = shaderMaterial(
    { emissiveIntensity: 1.0, time: 0 },
    // Vertex Shader
    `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
    // Fragment Shader
    `
        uniform float time;
        uniform float emissiveIntensity;
        varying vec2 vUv;
        varying vec3 vPosition;

        ${noise}

        void main() {
            float noiseValue = noise(vPosition + time);

            vec3 color = mix(vec3(1.0, 0.1, 0.0), vec3(1.0, 0.2, 0.0), noiseValue);
            float intensity = (noiseValue * 0.5 + 0.5) * emissiveIntensity;

            gl_FragColor = vec4(color * intensity, 1.0);
        }
        `
  );

  extend({ CustomShaderMaterial });

  const shaderRef = useRef<{ uniforms: { time: { value: number } } }>(null);

  // Update the time uniform on each frame
  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = clock.elapsedTime;
    }
  });

  return (
    <group>
      <instancedMesh
        // colliders="ball"
        userData={{ type: "Sun" }}
        type="kinematicPosition"
        position={SUN_OFFSET.toArray()}
        onClick={handleFocus}
      >
        <mesh>
          <sphereGeometry args={[SUN_RADIUS, 32, 32]} />
          <customShaderMaterial
            ref={shaderRef as React.Ref<any>}
            emissiveIntensity={5}
            time={0}
          />
        </mesh>

        <pointLight
          position={SUN_OFFSET.toArray()}
          intensity={4}
          color={"rgb(220, 250, 249)"}
          decay={0}
        />
      </instancedMesh>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ planetPosition: THREE.Vector3 }>,
            { planetPosition: position }
          );
          // return React.cloneElement(child, { planetPosition: position });
        }
        return child;
      })}
    </group>
  );
};

export default Sun;
