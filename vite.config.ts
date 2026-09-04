import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      dedupe: ['react', 'react-dom'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'motion/react',
        'lucide-react',
        'xlsx',
        'pptxgenjs',
        'docx',
        'marked',
        'dompurify',
        'canvas-confetti',
        'recharts',
        'exceljs',
        'jspdf',
        'html2canvas',
        'mammoth',
        '@supabase/supabase-js',
        'firebase/app',
        'firebase/firestore',
        'firebase/auth'
      ]
    },
    build: {
      minify: 'esbuild',
      cssMinify: true,
      target: 'es2020',
      manifest: 'asset-manifest.json',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
              return 'react-core';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            if (id.includes('node_modules/exceljs') || id.includes('node_modules/xlsx')) {
              return 'excel';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/docx') || id.includes('node_modules/pptxgenjs')) {
              return 'office-docs';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'charts';
            }
            if (id.includes('node_modules/motion')) {
              return 'motion';
            }
            if (id.includes('node_modules/firebase')) {
              return 'firebase';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'supabase';
            }
          }
        }
      }
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
