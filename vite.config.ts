import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@imgly/background-removal') || id.includes('onnxruntime-web')) {
            return 'background-removal'
          }
        },
      },
    },
  },
})
