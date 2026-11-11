import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// FAST VITE CONFIG - IGNORE PARENT DIRECTORIES
export default defineConfig({
  root: resolve(process.cwd()),
  
  plugins: [react()],
  
  server: {
    host: '0.0.0.0',
    port: 9999,
    strictPort: true,
    hmr: { overlay: false },
    watch: {
      ignored: ['../**', '**/node_modules/**']
    },
    fs: {
      allow: [process.cwd()],
      deny: ['../']
    }
  },
  
  optimizeDeps: {
    entries: ['src/main.jsx']
  }
})