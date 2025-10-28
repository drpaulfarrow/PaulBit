import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  build: {
    rollupOptions: {
      // Externalize React so the runtime imports are resolved via the import map in index.html
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime']
    }
  }
})
