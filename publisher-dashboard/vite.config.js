import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  build: {
    rollupOptions: {
      // Externalize React so runtime imports are resolved via the import map in index.html
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
  },
  server: {
    host: process.env.HOST || 'localhost', // 👈 '0.0.0.0' in Azure, 'localhost' locally
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
