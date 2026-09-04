import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import BochaScout from "./components/BochaScout";
import AuthGate from "./components/AuthGate";
import AthleteQuickStart from "./components/AthleteQuickStart";
import "./styles.css";

function App() {
  const [showScout, setShowScout] = useState(false);

  return showScout
    ? <BochaScout />
    : <AthleteQuickStart onContinue={() => setShowScout(true)} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);
