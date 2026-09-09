import React from "react";
import ReactDOM from "react-dom/client";
import BochaScout from "./components/BochaScout";
import AuthGate from "./components/AuthGate";
import "./styles.css";

function App() {
  return <BochaScout />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);

if(import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(console.error);});
}
