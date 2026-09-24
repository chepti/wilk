import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// WILK_BASE=/wilk-beta/ npm run build  → גרסת בדיקה; ברירת מחדל /wilk/
const base = process.env.WILK_BASE || '/wilk/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      [`${base}api`]: {
        target: 'http://localhost:8091',
        rewrite: (p) => p.replace(new RegExp(`^${base}api`), '/api'),
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
