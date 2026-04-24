import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Split heavy deps that aren't needed on the homepage into their own chunks,
    // so the initial bundle ships only what the masthead / tree-svg / side-rail need.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@xyflow') || id.includes('/dagre/')) return 'vendor-flow'
          if (id.includes('/katex/')) return 'vendor-katex'
          if (id.includes('/highlight.js/') || id.includes('/lowlight/') || id.includes('rehype-highlight'))
            return 'vendor-highlight'
          if (
            id.includes('react-markdown') ||
            id.includes('/remark-') ||
            id.includes('/rehype-') ||
            id.includes('/mdast') ||
            id.includes('/hast') ||
            id.includes('/micromark') ||
            id.includes('/unified/') ||
            id.includes('/vfile')
          )
            return 'vendor-markdown'
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3066',
        changeOrigin: true,
      },
    },
  },
})
