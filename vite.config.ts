import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      // OneDrive trava binários (ex.: favicons) durante a sincronização e o
      // watcher do Vite derruba o dev server com EBUSY. Ignorar assets que não
      // precisam de HMR evita o crash.
      ignored: ['**/public/logos/**', '**/*.ico'],
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
