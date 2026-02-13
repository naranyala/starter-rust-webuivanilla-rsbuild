import { defineConfig } from '@rsbuild/core';
import path from 'node:path';

export default defineConfig({
  source: {
    entry: {
      index: './src/main.ts',
    },
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  html: {
    template: './index.html',
  },
  output: {
    distPath: {
      root: './dist',
    },
    assetPrefix: './',
    filename: {
      js: 'static/js/[name].[contenthash:8].js',
      css: 'static/css/[name].[contenthash:8].css',
    },
    cleanDistPath: false,
  },
  server: {
    port: 3000,
    strictPort: true,
    printUrls: true,
  },
  performance: {
    chunkSplit: {
      strategy: 'single-vendor',
    },
  },
  dev: {
    writeToDisk: true,
    hmr: true,
  },
  tools: {
    rspack: {
      optimization: {
        splitChunks: false,
      },
      cache: {
        type: 'memory',
      },
    },
  },
});