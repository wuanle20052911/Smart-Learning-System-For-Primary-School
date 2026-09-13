const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000', '/public': 'http://localhost:3000' }
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
});
