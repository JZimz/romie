import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@romie/device-profiles': fileURLToPath(
        new URL('./src/packages/device-profiles/src', import.meta.url)
      ),
    },
  },
  build: {
    sourcemap: true,
  },
  plugins: [vue()],
});
