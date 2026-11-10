import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Extra hostnames are supplied through the environment so no machine-specific
// host is committed to the repo (e.g. the cloud preview hostname).
const extraHosts = (process.env.VITE_ALLOWED_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  // The sources are `.js` files that contain JSX, so treat them as JSX.
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: extraHosts.length ? extraHosts : undefined,
  },
});
