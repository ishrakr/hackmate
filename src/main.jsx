import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./app/App.jsx";

async function start() {
  if (import.meta.env.VITE_APP_MODE === "admin") {
    await import("./styles/admin.css");
  } else {
    await import("./styles/global.css");
  }

  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

start();
