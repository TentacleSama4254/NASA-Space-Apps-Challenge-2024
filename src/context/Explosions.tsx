/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useContext, useState } from "react";
import Explosion from "../components/Explosion";

const ExplosionContext = createContext({
  triggerExplosion: (position: any, lookAt: any) => {},
});

export const useExplosion = () => useContext(ExplosionContext);

import { ReactNode } from "react";

export const ExplosionProvider = ({ children }: { children: ReactNode }) => {
  const [explosions, setExplosions] = useState<ExplosionData[]>([]);

  interface ExplosionData {
    id: number;
    position: any;
    lookAt: any;
  }

  interface ExplosionContextType {
    triggerExplosion: (position: any, lookAt: any) => void;
  }

  const triggerExplosion = (position: any, lookAt: any) => {
    setExplosions((prev: ExplosionData[]) => [
      ...prev,
      { position, lookAt, id: Math.random() },
    ]);
  };

  const handleExplosionComplete = (id: number) => {
    setExplosions((prev: ExplosionData[]) =>
      prev.filter((explosion: ExplosionData) => explosion.id !== id)
    );
  };

  return (
    <ExplosionContext.Provider value={{ triggerExplosion }}>
      {children}
      {explosions.map(({ id, position, lookAt }) => (
        <Explosion
          key={id}
          id={id.toString()}
          position={position}
          lookAt={lookAt}
          onComplete={() => handleExplosionComplete(id)}
        />
      ))}
    </ExplosionContext.Provider>
  );
};
