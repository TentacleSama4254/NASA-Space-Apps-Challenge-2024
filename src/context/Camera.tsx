import { createContext, useContext, useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Camera, Spherical } from "three";

interface CameraContextType {
  focusedObject: { object: any; instanceId?: number } | null;
  handleFocus: (event: { object: any; instanceId?: number }) => void;
}

const CameraContext = createContext<CameraContextType | null>(null);

export const useCamera = () => useContext(CameraContext);

import { ReactNode } from "react";

interface CameraProviderProps {
  children: ReactNode;
}

export const CameraProvider = ({ children }: CameraProviderProps) => {
  const { camera, controls } = useThree() as { camera: Camera, controls: { target: Vector3, update: () => void } };
  const cameraTarget = useRef(new Vector3());
  const [focusedObject, setFocusedObject] = useState<{ object: any; instanceId?: number } | null>(null);
  const initialOffset = useRef(new Vector3());
  const isPanning = useRef(false);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const zoomFactor = 1.4;
      if (event.deltaY < 0) {
        initialOffset.current.multiplyScalar(1 / zoomFactor);
      } else {
        initialOffset.current.multiplyScalar(zoomFactor);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 1 || event.button === 0) { // Middle or left mouse button is pressed
        isPanning.current = true;
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1 || event.button === 0) { // Middle or left mouse button is released
        isPanning.current = false;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isPanning.current) {
        const panSpeed = 0.005;
        const spherical = new Spherical().setFromVector3(initialOffset.current);
        spherical.theta -= event.movementX * panSpeed;
        spherical.phi -= event.movementY * panSpeed;
        spherical.makeSafe();
        initialOffset.current.setFromSpherical(spherical);
      }
    };

    window.addEventListener('wheel', handleWheel);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useFrame(() => {
    if (focusedObject) {
      const target = focusedObject.object.position.clone();
      const smoothness = 0.8;

      // Calculate the desired camera position with the initial offset
      const desiredPosition = target.clone().add(initialOffset.current);

      // Smoothly interpolate the camera's position towards the desired position
      camera.position.lerp(desiredPosition, smoothness);

      // Ensure the camera is looking at the target position
      camera.lookAt(target);

      // Update controls if they exist
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }

      const distance = camera.position.distanceTo(target);
      // console.log("Distance:", distance, '\nCamera : ', camera.position, '\nCam target : ', cameraTarget.current, '\nTarget : ', target, '\nrelative pos : ', camera.position.clone().sub(target));
    }
  });

  // Handle focus
  const handleFocus = (event: { object: any; instanceId?: number }) => {
    const object = event.object;
    const instanceId = event.instanceId ?? 88;

    console.log("handleFocus", focusedObject, object.position, instanceId);

    if (instanceId !== undefined) {
      setFocusedObject({ object, instanceId });

      // Calculate and store the initial offset between the camera and the target
      initialOffset.current.copy(camera.position.clone().sub(object.position));
    }
  };

  return (
    <CameraContext.Provider value={{ focusedObject, handleFocus }}>
      {children}
    </CameraContext.Provider>
  );
};