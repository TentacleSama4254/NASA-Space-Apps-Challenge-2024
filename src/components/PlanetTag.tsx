import React, { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { Vector3 } from "three";
import { extractColors } from "extract-colors";

interface PlanetTagProps {
  position: number[];
  label: string;
  imageUrl?: string;
}

const PlanetTag: React.FC<PlanetTagProps> = ({ position, label, imageUrl }) => {
  const HtmlRef = useRef<HTMLDivElement>(null);
  const [dotColor, setDotColor] = useState("turquoise");

useEffect(() => {
  if (imageUrl) {
    extractColors(imageUrl)
        .then((colors) => {
          console.log(colors);
        if (colors.length > 0) {
          setDotColor(colors[0].hex); // Set the most prominent color
        }
      })
      .catch(console.error);
  }
}, [imageUrl]);

  return (
    <Html
      position={position ? new Vector3(...position) : undefined}
      style={{ pointerEvents: "none" }}
      ref={HtmlRef}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            backgroundColor: dotColor,
            borderRadius: "50%",
            position: "absolute",
            left: 0,
            top: 0,
            transform: "translate(-50%, -50%)",
          }}
        ></div>
        <span
          style={{
            marginLeft: "10px",
            color: "#bbbbbb", // Less bright white
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "'Space Mono', monospace", // Spacy font
          }}
        >
          {label}
        </span>
      </div>
    </Html>
  );
};

export default PlanetTag;
