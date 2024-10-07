// src/components/AsteroidField.tsx
import React, { useEffect, useState } from "react";
import Asteroid from "./Asteroid";

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
      {asteroids.slice(0, 20).map((asteroid, index) =>
        // console.log(asteroid)
        <Asteroid
          key={index}
          name={asteroid.name}
        //   diameter={asteroid.diameter}
          position={[asteroid.a, asteroid.e, asteroid.i]} // Example mapping
          
        />
        //   null
      )}
    </>
  );
};

export default AsteroidField;
