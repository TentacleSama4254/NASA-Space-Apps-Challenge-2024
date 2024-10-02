import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App.jsx";
import "./assets/styles/global.css";

import Test from "./components/test";


const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
      {/* <Test /> */}
    </React.StrictMode>
  );
} else {
  console.error("Root element not found");
}
