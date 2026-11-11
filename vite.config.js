import { defineConfig } from 'vite';

// Relative base so the built site works from any path and inside a Capacitor webview.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 700 },
});
