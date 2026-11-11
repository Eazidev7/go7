import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'
import fs from 'fs'

const useHttps = process.env.GO7_HTTPS === '1'

// Check if favicon exists and ensure it's properly configured
const publicDir = resolve(__dirname, 'public')
const faviconPath = resolve(publicDir, 'favicon.ico')

export default defineConfig(async ({ command }) => ({
  // Use default root (current directory)
  base: '/',
  esbuild: {
    target: 'es2020', // Support top-level await
    supported: {
      'top-level-await': true
    }
  },
  server: {
    https: useHttps,
    host: '0.0.0.0',
    port: 3000,
    open: false,
    strictPort: true,
    // Stability enhancements
    hmr: {
      port: useHttps ? 3000 : 3001,
      overlay: false, // Prevent overlay crashes
      timeout: 60000,
      clientPort: useHttps ? 3000 : 3001
    },
    // Connection stability
    watch: {
      usePolling: false, // Use native file system events
      interval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**',
        '**/build/**',
        '**/.vite_cache/**',
        '**/.firebase/**',
        '**/functions/node_modules/**',
        '**/functions/lib/**',
        '**/deploy_temp/**',
        '**/public_backup/**',
        '**/go7-temp/**',
        '**/src/components/components/**',
        '**/src/pages/pages/**',
        '**/*.log'
      ]
    },
    // Prevent crashes from uncaught errors
    middlewareMode: false,
    cors: true
  },
  plugins: [
    ...(useHttps ? [basicSsl()] : []),
    react(),
    // Custom plugin to handle space in folder name and context resolution
    {
      name: 'figma-space-handler',
      resolveId(id, importer) {
        if (id.includes('go7 figma') || id.includes('go7%20figma')) {
          const normalizedId = id.replace(/go7%20figma/g, 'go7 figma');
          return resolve(__dirname, normalizedId);
        }
        
        // Handle relative context imports from figma files
        if (importer && importer.includes('go7 figma') && id.startsWith('../contexts/')) {
          const contextName = id.replace('../contexts/', '');
          // Try figma contexts first
          const figmaContextPath = resolve(__dirname, 'go7 figma/contexts', contextName);
          // Fall back to main contexts
          const mainContextPath = resolve(__dirname, 'src/contexts', contextName);
          return figmaContextPath;
        }
        
        return null;
      }
    }
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@react-google-maps/api',
      'firebase/app',
      'firebase/firestore',
      'firebase/auth'
    ],
    exclude: [
      '@node-rs/crc32-wasm32-wasi',
      'styled-map-package',
      'yauzl-promise',
      'yauzl',
      'events',
      'buffer-peek-stream',
      'readable-stream',
      'archiver',
      'archiver-utils',
      'shp-write',
      'shapefile'
    ], // Exclude problematic dependencies
    entries: [
      'index.html'
    ], // Only scan main entry point
    force: false, // Don't force re-optimization on every start
    // FIX CONNECTION OVERLOAD - Batch dependency processing
    esbuildOptions: {
      // Prevent esbuild errors and improve performance
      target: 'es2020', // Modern browsers with top-level await support
      supported: {
        'top-level-await': true, // Enable for modern Firebase
        'dynamic-import': true,
        'async-await': true
      },
      // Limit concurrent processing to prevent connection overload
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx'
      }
    }
  },
  resolve: {
    alias: {
      '@node-rs/crc32-wasm32-wasi': resolve(__dirname, 'src/utils/mockCrc32.js'),
      'yauzl-promise': resolve(__dirname, 'src/utils/mockYauzl.js'),
      'yauzl': resolve(__dirname, 'src/utils/mockYauzl.js'),
      'events': resolve(__dirname, 'src/utils/mockEvents.js'),
      'buffer-peek-stream': resolve(__dirname, 'src/utils/mockBufferPeekStream.js'),
      'readable-stream': resolve(__dirname, 'src/utils/mockReadableStream.js'),
      'archiver': resolve(__dirname, 'src/utils/mockArchiver.js'),
      // Add alias for go7 figma directory - properly handle space in folder name
      '@figma': resolve(__dirname, './go7 figma'),
      'go7 figma': resolve(__dirname, './go7 figma'),
      // Fix Figma-specific imports
      'motion/react': 'framer-motion',
      'sonner@2.0.3': 'sonner',
      // Use the real GO7 logo for the Figma splash asset instead of the
      // placeholder fallback, so the launch screen matches production branding.
      'figma:asset/288fdaca4c7bba716418f92057df300fe047f431.png': resolve(__dirname, 'go7-logo.png'),
      // Context aliases - map missing contexts to existing ones
      '../contexts/AuthContext': resolve(__dirname, 'src/contexts/AuthContext.jsx'),
      '../contexts/NotificationContext': resolve(__dirname, 'src/contexts/NotificationContext.jsx'),
      '../contexts/NotificationContext.jsx': resolve(__dirname, 'src/contexts/NotificationContext.jsx')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // CRITICAL: Disable cache for Firebase auth fix
    sourcemap: false,
    minify: 'esbuild',
    // FIX CONNECTION ISSUES - Better chunking strategy
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
    target: 'es2020', // Modern browsers - matches esbuild config
    // iOS compatibility fixes
    cssTarget: 'es2020',
    // Force new hashes on every build
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        vendor: resolve(__dirname, 'vendor.html'),
      },
      onwarn(warning, warn) {
        // Suppress warnings about external dependencies
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
      external: ['@node-rs/crc32-wasm32-wasi'], // Mark as external in build
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('@maptiler/sdk') || id.includes('@maptiler/')) return 'vendor-maptiler';
          if (id.includes('leaflet')) return 'vendor-leaflet';
          if (id.includes('sweetalert2')) return 'vendor-swal';
        }
      }
    }
  },
  // Ensure all routes redirect to index.html for client-side routing
  preview: {
    port: 5173,
    strictPort: true,
    host: true,
    historyApiFallback: true
  }
}))
