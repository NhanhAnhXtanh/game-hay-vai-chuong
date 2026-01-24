import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks - split more granularly
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react/') || id.includes('react\\')) {
              return 'react-core';
            }
            // React DOM
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'react-router';
            }
            // Firebase - split by package
            if (id.includes('firebase/app')) {
              return 'firebase-app';
            }
            if (id.includes('firebase/auth')) {
              return 'firebase-auth';
            }
            if (id.includes('firebase/database')) {
              return 'firebase-database';
            }
            if (id.includes('firebase')) {
              return 'firebase-other';
            }
            // Chess.js
            if (id.includes('chess.js')) {
              return 'chess-vendor';
            }
            // Other node_modules
            return 'vendor';
          }
          
          // Game-specific chunks
          if (id.includes('/games/tictactoe/')) {
            return 'tictactoe';
          }
          if (id.includes('/games/chess/')) {
            return 'chess';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
})
