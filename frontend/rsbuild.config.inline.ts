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
      js: 'js',
      css: 'css',
    },
    filename: {
      js: '[name].js',
      css: '[name].css',
    },
    cleanDistPath: true,
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one', // Bundle everything together
    },
    assetFilter: (asset) => !asset.path.includes('node_modules'), // Don't split chunks from node_modules
  },
  html: {
    template: './index.html',
    scriptLoading: 'blocking',
    inject: 'body',
  },
});