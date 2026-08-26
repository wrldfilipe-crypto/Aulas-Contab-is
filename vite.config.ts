import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactDir = path.resolve(__dirname, 'node_modules/react');
const reactDomDir = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
        react: reactDir,
        'react-dom': reactDomDir,
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            if (id.includes('node_modules/exceljs')) {
              return 'exceljs';
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
