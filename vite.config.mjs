import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const isExtension = mode !== 'development';

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'icons/*',
            dest: 'icons'
          }
        ]
      })
    ],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      open: !isExtension ? '/popup.html' : false
    },
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          content: resolve(__dirname, 'src/content/content.js'),
          background: resolve(__dirname, 'src/background.js')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          manualChunks: {
            react: ['react', 'react-dom']
          }
        }
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: process.env.NODE_ENV !== 'production',
      assetsInlineLimit: 0,
      minify: 'terser',
      terserOptions: {
        format: {
          comments: false
        }
      }
    },
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        LOG_LEVEL: JSON.stringify('debug'),
        IS_EXTENSION: JSON.stringify(isExtension)
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  };
});