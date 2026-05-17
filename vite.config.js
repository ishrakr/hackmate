import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["hackmate.srv01.ishrak.xyz"],
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: ["hackmate.srv01.ishrak.xyz"],
  },
});
