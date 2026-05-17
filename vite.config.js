import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const allowedHosts = [
  "hackmate.srv01.ishrak.xyz",
  "admin.hackmate.srv01.ishrak.xyz",
];

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts,
  },
});
