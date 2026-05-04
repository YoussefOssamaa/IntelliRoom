import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@screens': path.resolve(__dirname, './src/screens'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      // React-planner alias — catalog elements import from 'react-planner'
      'react-planner': path.resolve(__dirname, './src/planner/index.js'),
      'gsap/ScrollTrigger': 'gsap/all',
    },
  },
  assetsInclude: ['**/*.glb', '**/*.obj', '**/*.mtl'],
  optimizeDeps: {
    include: ['immutablediff', 'immutablepatch'],
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: `http://${process.env.VITE_API_URL_BACKEND_BASE}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
