/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useState, useContext, useCallback } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const TrailContext = createContext({
  addTrailPoint: (key: string, position: any) => {},
  clearTrail: (key: string) => {},
});

export const useTrails = () => useContext(TrailContext);

import { ReactNode } from "react";

interface TrailProviderProps {
  children: ReactNode;
}

export const TrailProvider = ({ children }: TrailProviderProps) => {
  const [trails, setTrails] = useState<{ [key: string]: (number | THREE.Vector3 | [number, number, number] | [number, number])[] }>({});

interface Trails {
    [key: string]: any[];
}

interface Position {
    clone: () => Position;
    distanceToSquared: (position: Position) => number;
}

const addTrailPoint = useCallback((key: string, position: Position) => {
    setTrails((prevTrails: Trails) => {
        const trail = prevTrails[key] || [];
        const newTrail = trail.length >= 300 ? trail.slice(1) : trail;
        const lastPoint = newTrail[newTrail.length - 1];
        if (!lastPoint || lastPoint.distanceToSquared(position) > 1) {
            return { ...prevTrails, [key]: [...newTrail, position.clone()] };
        }
        return prevTrails;
    });
}, []);

  const clearTrail = useCallback((key: any) => {
    setTrails((prevTrails) => {
      const { [key]: _, ...rest } = prevTrails; // Destructuring to omit the key
      return rest;
    });
  }, []);

  return (
    <TrailContext.Provider value={{ addTrailPoint, clearTrail }}>
      {children}
      {Object.entries(trails).map(([key, positions]: [string, (number | THREE.Vector3 | [number, number, number] | [number, number])[]]) => (
        <Line key={key} points={positions} color="rgba(30,30,30)" />
      ))}
    </TrailContext.Provider>
  );
};
