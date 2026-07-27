import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

/**
 * İki build modu:
 *   vite build                     → normal statik site (dist/, kod bölünmüş, 3D ayrı chunk)
 *   vite build --mode singlefile   → tek dosyalık offline HTML (jüri demosu, çift tıkla açılır)
 *
 * Tek dosya modu, catalyst.html'in "internet gerektirmez" garantisini korur.
 */
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'singlefile' ? [viteSingleFile()] : [])],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: mode === 'singlefile' ? 'dist-tek-dosya' : 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions:
      mode === 'singlefile'
        ? {}
        : {
            output: {
              // 3D katmanı ve grafik kütüphanesi ayrı chunk — ilk açılış hafif kalsın
              manualChunks(id: string) {
                if (/node_modules\/(three|@react-three)/.test(id)) return 'three';
                if (/node_modules\/(chart\.js|react-chartjs-2)/.test(id)) return 'charts';
                return null;
              },
            },
          },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
