import { useState, useCallback } from "react";
import { Vector3 } from "three";

const usePosition = (initialPosition: Vector3) => {
  const [position, setPosition] = useState(initialPosition);

  const updatePosition = useCallback((newPosition: Vector3) => {
    setPosition(newPosition);
  }, []);

  return [position, updatePosition] as const;
};

export default usePosition;
