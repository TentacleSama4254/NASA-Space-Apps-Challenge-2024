import React, { useState } from "react";
import type { AsteroidLayerToggles } from "../AsteroidCloud";

interface ToolbarBubbleProps {
  asteroidLayers: AsteroidLayerToggles;
  onAsteroidLayersChange: React.Dispatch<React.SetStateAction<AsteroidLayerToggles>>;
  asteroidStats: { visible: number; loading: boolean };
}

const buttons = [
  {
    label: "Explore",
    title: "Explore objects",
    path: "M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z",
  },
  {
    label: "Data",
    title: "Data sources",
    path: "M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z",
  },
];

const asteroidControls: Array<{
  key: keyof AsteroidLayerToggles;
  label: string;
  color: string;
}> = [
  { key: "mainBelt", label: "Main Belt", color: "#7fb4ff" },
  { key: "nearEarth", label: "Near Earth", color: "#8dfac9" },
  { key: "pha", label: "PHA", color: "#ffcf6d" },
  { key: "closeApproaches", label: "Close", color: "#ff6b5a" },
];

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  border: 0,
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.84)",
  cursor: "pointer",
};

const ToolbarBubble: React.FC<ToolbarBubbleProps> = ({
  asteroidLayers,
  onAsteroidLayersChange,
  asteroidStats,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const expandableStyle: React.CSSProperties = {
    maxWidth: isExpanded ? 130 : 0,
    opacity: isExpanded ? 1 : 0,
    overflow: "hidden",
    transform: isExpanded ? "translateY(0)" : "translateY(2px)",
    transition: "max-width 220ms ease, opacity 180ms ease, transform 220ms ease",
    pointerEvents: isExpanded ? "auto" : "none",
  };

  return (
    <nav
      aria-label="Solar system tools"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onFocus={() => setIsExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsExpanded(false);
      }}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 28,
        zIndex: 50,
        transform: "translateX(-50%)",
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: isExpanded ? 10 : 0,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "linear-gradient(135deg, rgba(44,44,44,0.82), rgba(8,8,8,0.92))",
        color: "white",
        boxShadow: "0 16px 36px rgba(0,0,0,0.38)",
        backdropFilter: "blur(12px)",
        maxWidth: "calc(100vw - 24px)",
        overflow: "hidden",
        justifyContent: "center",
        transition: "gap 220ms ease, padding 220ms ease",
      }}
    >
      {buttons.map((button, index) => (
        <button
          key={button.label}
          type="button"
          title={button.title}
          style={{
            ...iconButtonStyle,
            marginRight: !isExpanded && index === 0 ? 6 : 0,
            transition: "margin 220ms ease",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{ width: 18, height: 18, flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={button.path} />
          </svg>
        </button>
      ))}
      {asteroidControls.map((control) => {
        const checked = asteroidLayers[control.key];
        return (
          <label
            key={control.key}
            title={`Toggle ${control.label}`}
            style={{
              ...expandableStyle,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: checked ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.46)",
              fontSize: 11,
              lineHeight: 1,
              fontFamily: "'Space Mono', monospace",
              whiteSpace: "nowrap",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                onAsteroidLayersChange((current) => ({
                  ...current,
                  [control.key]: !current[control.key],
                }));
              }}
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                border: `1px solid ${checked ? control.color : "rgba(255,255,255,0.28)"}`,
                appearance: "none",
                background: checked ? control.color : "rgba(255,255,255,0.06)",
                boxShadow: checked ? `0 0 10px ${control.color}66` : "none",
                margin: 0,
                flexShrink: 0,
              }}
            />
            <span>{control.label}</span>
          </label>
        );
      })}
      <span
        aria-live="polite"
          style={{
            ...expandableStyle,
            minWidth: isExpanded ? 92 : 0,
            textAlign: "center",
            color: "rgba(255,255,255,0.58)",
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            whiteSpace: "nowrap",
          }}
        >
        {asteroidStats.loading
          ? "Loading..."
          : `${asteroidStats.visible.toLocaleString()} objects`}
      </span>
    </nav>
  );
};

export default ToolbarBubble;
