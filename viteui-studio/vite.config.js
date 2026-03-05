import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../src/BuiltinExtensions/ComfyUIBackend/Assets',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'viteui_studio.js',
        chunkFileNames: 'viteui_studio-[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'viteui_studio.css';
          }
          return 'viteui_studio-[name].[ext]';
        }
      }
    }
  },
  server: {
    proxy: {
      '/API': {
        target: 'http://localhost:7801',
        changeOrigin: true
      }
    }
  }
})