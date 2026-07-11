import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

// Resolve packages/core references properly
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'orbit-core': join(__dirname, '../core/src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/generated': 'http://localhost:5000'
    }
  }
});
