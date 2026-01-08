import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.main.config.mjs';

export default mergeConfig(viteConfig, defineConfig({}));
