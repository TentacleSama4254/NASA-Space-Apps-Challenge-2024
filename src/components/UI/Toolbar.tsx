import React, { useState } from "react";

const ToolbarBubble: React.FC = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div
      className={`fixed bottom-11 left-1/2 transform -translate-x-1/2 flex items-center justify-center w-full`} 
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsActive(false);
      }}
      style={{
        transition:
          "height 0.3s ease, max-width 0.3s ease, transform 0.3s ease",
        height: isActive ? "auto" : "48px", 
        transform: isActive ? "translate(-50%, 0)" : "translate(-50%, 50%)",
      }}
    >
      <div
        className={`flex items-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 p-2 text-white shadow-xl backdrop-blur-lg`}
        style={{
          transition: "max-width 0.3s ease, max-height 0.3s ease",
          maxWidth: isActive ? "600px" : "90px", 
          maxHeight: isActive ? "100px" : "48px",
        }}
      >
        <div
          className={`flex items-center ${
            isActive ? "space-x-1" : "justify-center"
          }`}
        >
          <button
            className={`flex items-center justify-center rounded-full transition duration-300 ease-in-out ${
              isActive ? "opacity-100 w-10 h-10 p-2" : "opacity-50 w-6 h-6 p-1"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-full w-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
              />
            </svg>
          </button>

          <button
            className={`flex items-center justify-center rounded-full transition duration-300 ease-in-out ${
              isActive ? "opacity-100 w-10 h-10 p-2" : "opacity-50 w-6 h-6 p-1"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-full w-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
              />
            </svg>
          </button>


        </div>
      </div>
    </div>
  );
};

export default ToolbarBubble;
