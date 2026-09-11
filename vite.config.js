const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  root: 'client',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: '../client/dist',
    emptyOutDir: true
  }
});
