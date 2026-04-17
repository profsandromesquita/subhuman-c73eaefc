import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { prerenderPlugin } from "./scripts/vite-plugin-prerender";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    prerenderPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) return "vendor-react";
            if (id.includes("@radix-ui")) return "vendor-ui";
            if (id.includes("@tiptap")) return "vendor-editor";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts")) return "vendor-charts";
          }
        },
      },
    },
  },
}));
