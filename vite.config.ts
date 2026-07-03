import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // Não limpa o terminal — mantém legível o output do Tauri (desktop:dev).
  clearScreen: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Porta fixa para o Tauri (devUrl em src-tauri/tauri.conf.json aponta para 5173).
    port: 5173,
    strictPort: true,
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
