import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "hackmate.srv01.ishrak.xyz",
    port: 5173,
  },
  preview: {
    host: "hackmate.srv01.ishrak.xyz",
    port: 4173,
  },
});
