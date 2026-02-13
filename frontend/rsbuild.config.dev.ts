import { defineConfig } from '@rsbuild/core';
import path from 'node:path';

export default defineConfig({
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    distPath: {
      root: 'dist',
      js: 'static/js',
      css: 'static/css',
    },
    filename: {
      js: '[name].[contenthash:8].js',
      css: '[name].[contenthash:8].css',
    },
    cleanDistPath: false, // Don't clean for faster incremental builds
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    hmr: true, // Enable hot module replacement
  },
  performance: {
    chunkSplit: false, // Disable for faster incremental builds
  },
  html: {
    template: './index.html',
  },
});