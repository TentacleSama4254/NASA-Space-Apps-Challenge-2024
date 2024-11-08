import React, { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { Vector3 } from "three";
import { extractColors } from "extract-colors";

interface PlanetTagProps {
  position: number[];
  label: string;
  imageUrl?: string;
  opacity: number; // Add opacity prop
  onClick?: () => void; // Add onClick prop
  occlude?: any[]; // Add occlude prop
}

const PlanetLabel: React.FC<PlanetTagProps> = ({
  position,
  label,
  imageUrl,
  opacity,
  onClick, // Destructure onClick prop
  occlude, // Destructure occlude prop
}) => {
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
      style={{ pointerEvents: "auto", opacity }} // Apply opacity and enable pointer events
      ref={HtmlRef}
      occlude={occlude} // Pass occlude prop to Html component
    >
      <div style={{ position: "relative" }} onClick={onClick}>
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
            userSelect: "none", // Make text unselectable
          }}
        >
          {label}
        </span>
      </div>
    </Html>
  );
};

export default PlanetLabel;
