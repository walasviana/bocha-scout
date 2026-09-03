import React from "react";
import ReactDOM from "react-dom/client";
import BochaScout from "./components/BochaScout";
import AuthGate from "./components/AuthGate";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>
      <BochaScout />
    </AuthGate>
  </React.StrictMode>
);
