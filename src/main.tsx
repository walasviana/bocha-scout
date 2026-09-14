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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const reportBuild = () => {
      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
        .map(script => new URL(script.src).pathname);
      navigator.serviceWorker.controller?.postMessage({ type: 'BOCHA_CLIENT_READY', scripts });
    };
    navigator.serviceWorker.addEventListener('controllerchange', reportBuild);
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
      reportBuild();
      const checkUpdate = () => { if (navigator.onLine) void registration.update().catch(console.error); };
      window.addEventListener('online', checkUpdate);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
    }).catch(console.error);
  });
}
