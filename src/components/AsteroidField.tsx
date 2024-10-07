// src/components/AsteroidField.tsx
import React, { useEffect, useState } from "react";
import Asteroid from "./Asteroid";
import Revolution from "./Revolution";

const AsteroidField = () => {
  const [asteroids, setAsteroids] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/src/assets/csvjson.json");
      const data = await response.json();
    //   console.log(data);
      setAsteroids(data);
    };

    fetchData();
  }, []);
    
    

  return (
    <>
      {asteroids.slice(0, 20).map(
        (asteroid, index) => (
          // console.log(asteroid)
          <Revolution
            Component={Asteroid}
            key={`asteroid_${index}`}
            componentProps={{
              name: asteroid.name,
              scale: asteroid.scale,
              texture_path: asteroid.texture_path,
              position: [asteroid.a, asteroid.e, asteroid.i],
            }}
            orbit={{
              a: asteroid.a,
              e: asteroid.e,
              inclination: asteroid.i,
              omega: asteroid.omega,
              raan: asteroid.raan,
              q: asteroid.q,
            }}
          />
        )
        // <Asteroid
        //   key={index}
        //       name={asteroid.name}
        //       scale={asteroid.scale}
        //       texture_path=""
        // //   diameter={asteroid.diameter}
        //   position={[asteroid.a, asteroid.e, asteroid.i]} // Example mapping

        // />
        //   null
      )}
    </>
  );
};

export default AsteroidField;
