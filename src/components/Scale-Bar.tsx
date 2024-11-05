import React from "react";

type Props = {
  scaleTextKm: string;
  scaleTextAu: string;
  padding_left: number;
  padding_bottom: number;
};

const ScaleBar: React.FC<Props> = ({
  scaleTextKm,
  scaleTextAu,
  padding_left,
  padding_bottom,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: padding_bottom,
        left: padding_left,
        color: "white",
      }}
    >
      <div style={{ marginBottom: "5px" }}>{scaleTextKm}</div>
      <div>{scaleTextAu}</div>
    </div>
  );
};

export default ScaleBar;
