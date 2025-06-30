import { createContext, useContext, useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Camera, Spherical } from "three";

interface CameraContextType {
  focusedObject: { object: any; instanceId?: number } | null;
  handleFocus: (event: { object: any; instanceId?: number }) => void;
  cameraLocation: Vector3;
  scaleTextKm: string;
  scaleTextAu: string;
  zoomLevel: number;
}

export const CameraContext = createContext<CameraContextType | null>(null);

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
  const initialTouchDistance = useRef(0);
  const initialTouchOffset = useRef(new Vector3());
  const predefinedDistance = 20;

  const [scaleTextKm, setScaleTextKm] = useState("1000km");
  const [scaleTextAu, setScaleTextAu] = useState("0.0067AU");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cameraLocation, setLocation] = useState(new Vector3());

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const zoomFactor = 1.4;
      if (event.deltaY < 0) {
        initialOffset.current.multiplyScalar(1 / zoomFactor);
      } else {
        initialOffset.current.multiplyScalar(zoomFactor);
      }
      updateScale();
    };

    const updateScale = () => {
      const zoomLevel = camera.position.length();
      // console.log("Zoom level:", zoomLevel);
      setZoomLevel(zoomLevel);
      const scaleKm = (zoomLevel / 1000).toFixed(2) + "km";
      const scaleAu = (zoomLevel / 149597870.7).toFixed(4) + "AU";
      setScaleTextKm(scaleKm);
      setScaleTextAu(scaleAu);
      setLocation(camera.position);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 1 || event.button === 0) {
        // Middle or left mouse button is pressed
        isPanning.current = true;
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1 || event.button === 0) {
        // Middle or left mouse button is released
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

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        isPanning.current = true;
        initialTouchOffset.current.copy(initialOffset.current);
      } else if (event.touches.length === 2) {
        initialTouchDistance.current =
          event.touches[0].pageX - event.touches[1].pageX;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isPanning.current && event.touches.length === 1) {
        const panSpeed = 0.005;
        const movementX = event.touches[0].pageX - event.touches[0].clientX;
        const movementY = event.touches[0].pageY - event.touches[0].clientY;
        const spherical = new Spherical().setFromVector3(
          initialTouchOffset.current
        );
        spherical.theta -= movementX * panSpeed;
        spherical.phi -= movementY * panSpeed;
        spherical.makeSafe();
        initialOffset.current.setFromSpherical(spherical);
      } else if (event.touches.length === 2) {
        const newTouchDistance =
          event.touches[0].pageX - event.touches[1].pageX;
        const zoomFactor = 1.4;
        if (newTouchDistance > initialTouchDistance.current) {
          initialOffset.current.multiplyScalar(1 / zoomFactor);
        } else {
          initialOffset.current.multiplyScalar(zoomFactor);
        }
        initialTouchDistance.current = newTouchDistance;
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        isPanning.current = false;
      }
    };

    window.addEventListener("wheel", handleWheel);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const transitioning = useRef(false);
  const transitionStartPosition = useRef(new Vector3());
  const transitionStartTarget = useRef(new Vector3());
  const transitionProgress = useRef(0);
  const transitionDuration = 1.5; // Duration in seconds

  useFrame((_, delta) => {
    if (focusedObject) {
      const target = focusedObject.object.position.clone();
      // Desired camera position relative to the focused object
      const desiredPosition = target.clone().add(initialOffset.current);

      if (transitioning.current) {
        // Smooth transition
        transitionProgress.current += delta / transitionDuration;
        
        if (transitionProgress.current >= 1) {
          // Transition complete
          transitioning.current = false;
          transitionProgress.current = 1;
        }

        // Use easing function for smooth transition
        const easeInOutCubic = (t: number): number => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };
        
        const easedProgress = easeInOutCubic(transitionProgress.current);

        // Interpolate camera position
        camera.position.lerpVectors(transitionStartPosition.current, desiredPosition, easedProgress);
        
        // Interpolate camera look-at target
        const currentTarget = new Vector3().lerpVectors(transitionStartTarget.current, target, easedProgress);
        camera.lookAt(currentTarget);

        // Update controls if they exist
        if (controls) {
          controls.target.lerpVectors(transitionStartTarget.current, target, easedProgress);
          controls.update();
        }
      } else {
        // Normal tracking when not transitioning
        camera.position.copy(desiredPosition);
        camera.lookAt(target);

        // Update controls if they exist
        if (controls) {
          controls.target.copy(target);
          controls.update();
        }
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
      // Store current camera state for smooth transition
      transitionStartPosition.current.copy(camera.position);
      if (controls) {
        transitionStartTarget.current.copy(controls.target);
      } else {
        // If no controls, estimate current look-at target
        const currentDirection = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        transitionStartTarget.current.copy(camera.position).add(currentDirection.multiplyScalar(100));
      }
      
      // Reset transition progress
      transitionProgress.current = 0;
      
      setFocusedObject({ object, instanceId });

      // Calculate and store the initial offset between the camera and the target
      const direction = camera.position.clone().sub(object.position).normalize();
      initialOffset.current.copy(
        direction.multiplyScalar(
          object?.geometry?.parameters?.radius
            ? object?.geometry?.parameters?.radius * 1.9
            : predefinedDistance
        )
      );

      // Apply a slight rotation to the camera
      const spherical = new Spherical().setFromVector3(initialOffset.current);
      spherical.theta += 0.5; // Adjust this value for the desired rotation
      spherical.phi -= 0.05; // Adjust this value for the desired rotation
      spherical.makeSafe();
      initialOffset.current.setFromSpherical(spherical);
      
      // Start the transition
      transitioning.current = true;
    }
  };

  return (
    <CameraContext.Provider value={{ focusedObject, handleFocus,scaleTextKm, scaleTextAu, zoomLevel, cameraLocation }}>
      {children}
    </CameraContext.Provider>
  );
};