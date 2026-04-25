import React from "react";

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

const ToolbarBubble: React.FC = () => (
  <nav
    aria-label="Solar system tools"
    style={{
      position: "fixed",
      left: "50%",
      bottom: 28,
      zIndex: 50,
      transform: "translateX(-50%)",
    }}
  >
    <div
      className="group"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.1)",
        background:
          "linear-gradient(135deg, rgba(64,64,64,0.82), rgba(10,10,10,0.92))",
        color: "white",
        boxShadow: "0 16px 36px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
      }}
    >
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          title={button.title}
          style={{
            width: 38,
            height: 38,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border: 0,
            borderRadius: 999,
            background: "transparent",
            color: "rgba(255,255,255,0.78)",
            cursor: "pointer",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={button.path} />
          </svg>
        </button>
      ))}
    </div>
  </nav>
);

export default ToolbarBubble;
