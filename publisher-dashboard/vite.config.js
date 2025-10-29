import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  build: {
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
  },
  server: {
    host: process.env.HOST || 'localhost',  // 👈 0.0.0.0 on Azure, localhost locally
    port: process.env.PORT ? Number(process.env.PORT) : 5173, // 👈 Azure injects PORT=80 or 5173
  },
})
