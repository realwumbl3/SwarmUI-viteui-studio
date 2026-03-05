import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..')
  const portValue = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173

  return {
    plugins: [react()],
    envDir: '..',
    build: {
      outDir: '../src/BuiltinExtensions/ComfyUIBackend/Assets',
      emptyOutDir: false,
      sourcemap: 'inline',
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
      port: Number.isNaN(portValue) ? 5173 : portValue,
      host: true,
      proxy: {
        '/API': {
          target: 'http://localhost:7801',
          changeOrigin: true
        },
        '/viteapi': {
          target: 'http://localhost:7801',
          changeOrigin: true
        },
        '/workspaces': {
          target: 'http://localhost:7801',
          changeOrigin: true
        },
        '/ws': {
          target: 'http://localhost:7801',
          changeOrigin: true,
          ws: true
        }
      },
      watch: {
        ignored: ['**/venv/**', '**/node_modules/**', '**/backend/**', '**/models/**', '**/extensions/**', '**/k_diffusion/**', '**/scripts/**'],
      },
    },
  }
})