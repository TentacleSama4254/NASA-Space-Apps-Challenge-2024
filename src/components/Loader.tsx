import React from "react";
import { Html, useProgress } from "@react-three/drei";

const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: "white", fontSize: "36px" }}>
        Loading... {progress.toFixed(2)}%
      </div>
    </Html>
  );
};

export default Loader;
