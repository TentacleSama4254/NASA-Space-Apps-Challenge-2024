import React, { useEffect, useState } from "react";
import { DISTANCE_SCALE_KM } from "../config/constants";

const ScaleBar: React.FC = () => {
  const [readout, setReadout] = useState({
    primary: "Camera distance: ---",
    secondary: `1 scene unit = ${DISTANCE_SCALE_KM.toLocaleString()} km`,
  });

  useEffect(() => {
    const handleScaleChange = (event: Event) => {
      const detail = (event as CustomEvent<typeof readout>).detail;
      if (detail?.primary && detail?.secondary) setReadout(detail);
    };
    window.addEventListener("solar-scale-change", handleScaleChange);
    return () => window.removeEventListener("solar-scale-change", handleScaleChange);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        bottom: 18,
        zIndex: 40,
        pointerEvents: "none",
        color: "rgba(255,255,255,0.88)",
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        lineHeight: 1.35,
        letterSpacing: "0.04em",
        textShadow: "0 1px 8px rgba(0,0,0,0.9)",
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.82)" }}>{readout.primary}</div>
      <div style={{ color: "rgba(255,255,255,0.45)" }}>{readout.secondary}</div>
    </div>
  );
};

export default ScaleBar;
