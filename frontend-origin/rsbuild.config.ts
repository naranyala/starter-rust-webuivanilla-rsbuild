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
    cleanDistPath: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    printUrls: true,
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
    removeConsole: process.env.NODE_ENV === 'production',
  },
  dev: {
    writeToDisk: true,
  },
  tools: {
    rspack: {
      optimization: {
        splitChunks: {
          chunks: 'all',
          hidePathInfo: true,
          maxInitialRequests: 20,
          maxAsyncRequests: 20,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      },
      cache: {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      },
    },
  },
});