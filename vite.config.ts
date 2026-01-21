import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Force rebuild: 2026-01-19
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'AIRTABLE_'],
  build: {
    minify: 'terser',
    sourcemap: false, // Evita la reconstrucción del código en el inspector
    terserOptions: {
      compress: {
        drop_console: true, // Elimina logs automáticamente
        drop_debugger: true,
      },
      mangle: true, // Ofusca nombres de variables y funciones
    },
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        // Mangling adicional para ofuscar la estructura
        manualChunks: undefined,
      }
    }
  }
});
