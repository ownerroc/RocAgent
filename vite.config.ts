import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
      'react-is': path.resolve(import.meta.dirname, 'node_modules/react-is/index.js'),
    },
    dedupe: ['react', 'react-dom', 'react-is', 'recharts'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-is', 'recharts', 'react/jsx-runtime'],
    rolldownOptions: {
      mainFields: ['browser', 'module', 'main'],
    },
  },
  ssr: {
    noExternal: ['recharts', 'react-is'],
    external: ['fsevents'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('recharts')) return 'charts';
        },
      },
      external: ['fsevents'],
    },
  },
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    port: parseInt(process.env.VITE_PORT || process.env.PORT || '3001', 10),
    allowedHosts: process.env.VITE_ALLOWED_HOSTS ? process.env.VITE_ALLOWED_HOSTS.split(',') : ['localhost', '127.0.0.1'],
    hmr: false,
  },
});
