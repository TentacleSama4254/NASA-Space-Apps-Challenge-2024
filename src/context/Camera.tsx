import { createContext, useContext, useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Matrix4, Camera } from "three";

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

  useFrame(() => {
    if (focusedObject) {
      let target;

        target = focusedObject.object.position.clone();
        // console.log("TARGET : ",target, focusedObject.object);
     
      const smoothness = 0.05;
      cameraTarget.current.lerp(target, smoothness);
      camera.lookAt(cameraTarget.current);

      controls?.target.copy(cameraTarget.current);
      controls.update();
    }
  });

  // Handle focus
  const handleFocus = (event: { object: any; instanceId?: number }) => {
    const object = event.object;
    const instanceId = event.instanceId??88;

    console.log("handleFocus", focusedObject, instanceId);

    if (instanceId !== undefined) {
      setFocusedObject({ object, instanceId });
    } else {
    <CameraContext.Provider value={{ focusedObject, handleFocus } as CameraContextType}></CameraContext.Provider>
    }
  };

  return (
    <CameraContext.Provider value={{ focusedObject, handleFocus }}>
      {children}
    </CameraContext.Provider>
  );
};
