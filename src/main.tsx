import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import App from "./App";
import "./styles.css";
import "./styles-v2.css";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const key = "cerces-preload-reload";
  const lastReload = Number(sessionStorage.getItem(key) ?? 0);
  if (Date.now() - lastReload < 10_000) return;
  sessionStorage.setItem(key, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
    >
      <App />
    </MotionConfig>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
