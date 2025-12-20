import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@main': fileURLToPath(new URL('./src/main', import.meta.url)),
      '@romie/device-profiles': fileURLToPath(
        new URL('./src/packages/device-profiles/src', import.meta.url)
      ),
      '@romie/ra-hasher': fileURLToPath(new URL('./src/packages/ra-hasher/src', import.meta.url)),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      external: ['better-sqlite3'],
    },
  },
});
