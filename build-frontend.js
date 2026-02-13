#!/usr/bin/env node

import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

async function buildFrontend() {
    console.log('Building frontend...');
    
    // Use process.cwd() as project root (simplest approach)
    const originalDir = process.cwd();
    const frontendDir = path.join(originalDir, 'frontend');
    process.chdir(frontendDir);
    
    // Store original directory and change to frontend
    process.chdir(frontendDir);

  try {
    // Install dependencies if needed
    console.log('Checking frontend dependencies...');
    try {
      await fs.access('node_modules');
      console.log('Frontend dependencies already installed.');
    } catch {
      console.log('Installing frontend dependencies...');
      execSync('bun install', { stdio: 'inherit' });
    }

    // Run rsbuild production build
    console.log('Running rsbuild production build...');
    execSync('bun run build:incremental', { stdio: 'inherit' });

    // Flatten JS files first
    console.log('Flattening JS files...');
    const jsSrcDir = './dist/static/js';
    const jsDestDir = './dist/static/js/';
    await fs.mkdir(jsDestDir, { recursive: true });

    // Look for nested JS files and flatten them
    const nestedJsDir = './dist/static/js/static/js/';
    if (await pathExists(nestedJsDir)) {
      const jsFiles = await fs.readdir(nestedJsDir);
      for (const file of jsFiles) {
        const srcPath = path.join(nestedJsDir, file);
        const destPath = path.join(jsDestDir, file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          console.log(`  Copied: ${file}`);
        }
      }
    }

    // Flatten CSS files
    console.log('Flattening CSS files...');
    const cssSrcDir = './dist/static/css';
    const cssDestDir = './dist/static/css/';
    await fs.mkdir(cssDestDir, { recursive: true });

    // Look for nested CSS files and flatten them
    const nestedCssDir = './dist/static/css/static/css/';
    if (await pathExists(nestedCssDir)) {
      const cssFiles = await fs.readdir(nestedCssDir);
      for (const file of cssFiles) {
        const srcPath = path.join(nestedCssDir, file);
        const destPath = path.join(cssDestDir, file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          console.log(`  Copied: ${file}`);
        }
      }
    }

    // Copy static files to root for WebUI server
    console.log('Copying static files to root...');
    const rootStaticDir = path.join(originalDir, 'static');
    await fs.mkdir(path.join(rootStaticDir, 'js'), { recursive: true });
    await fs.mkdir(path.join(rootStaticDir, 'css'), { recursive: true });

    const distJsDir = './dist/static/js/';
    if (await pathExists(distJsDir)) {
      const rootJsFiles = await fs.readdir(distJsDir);
      for (const file of rootJsFiles) {
        const srcPath = path.join(distJsDir, file);
        const destPath = path.join(rootStaticDir, 'js', file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          console.log(`  Copied to root: ${file}`);
        }
      }
    }

    const distCssDir = './dist/static/css/';
    if (await pathExists(distCssDir)) {
      const rootCssFiles = await fs.readdir(distCssDir);
      for (const file of rootCssFiles) {
        const srcPath = path.join(distCssDir, file);
        const destPath = path.join(rootStaticDir, 'css', file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          console.log(`  Copied to root: ${file}`);
        }
      }
    }

    // Copy WinBox files to static directories
    console.log('Copying WinBox files to static directories...');
    const winboxJsSrc = './node_modules/winbox/dist/js/winbox.min.js';
    const winboxCssSrc = './node_modules/winbox/dist/css/winbox.min.css';
    
    try {
      await fs.copyFile(winboxJsSrc, path.join(originalDir, 'static', 'js', 'winbox.min.js'));
      console.log('  Copied winbox.min.js to static/js/');
    } catch (err) {
      console.warn(`  Warning: Could not copy WinBox JS file: ${err.message}`);
    }
    
    try {
      await fs.copyFile(winboxCssSrc, path.join(originalDir, 'static', 'css', 'winbox.min.css'));
      console.log('  Copied winbox.min.css to static/css/');
    } catch (err) {
      console.warn(`  Warning: Could not copy WinBox CSS file: ${err.message}`);
    }

    // Also copy WinBox files to dist folder for rsbuild preview/dev
    try {
      await fs.copyFile(winboxJsSrc, path.join(frontendDir, 'dist', 'static', 'js', 'winbox.min.js'));
      await fs.copyFile(winboxCssSrc, path.join(frontendDir, 'dist', 'static', 'css', 'winbox.min.css'));
      console.log('  Copied WinBox files to dist/');
    } catch (err) {
      console.warn(`  Warning: Could not copy WinBox files to dist: ${err.message}`);
    }

    // Also copy WinBox files to frontend-origin for serving
    const originDir = path.join(originalDir, 'frontend-origin');
    try {
      await fs.mkdir(path.join(originDir, 'static', 'js'), { recursive: true });
      await fs.mkdir(path.join(originDir, 'static', 'css'), { recursive: true });
      await fs.copyFile(winboxJsSrc, path.join(originDir, 'static', 'js', 'winbox.min.js'));
      await fs.copyFile(winboxCssSrc, path.join(originDir, 'static', 'css', 'winbox.min.css'));
      console.log('  Copied WinBox files to frontend-origin/static/');
    } catch (err) {
      console.warn(`  Warning: Could not copy WinBox files to frontend-origin: ${err.message}`);
    }

    // Now update the HTML paths to use root static
    console.log('Updating index.html paths...');
    let indexHtml = await fs.readFile('./dist/index.html', 'utf8');

    // Replace nested paths with root paths first
    indexHtml = indexHtml.replace(/src="\.\/static\/js\/static\/js\//g, 'src="/static/js/')
                         .replace(/href="\.\/static\/css\/static\/css\//g, 'href="/static/css/');

    // Find the actual filenames in the dist static directory
    const distJsFiles = await fs.readdir(path.join(frontendDir, 'dist', 'static', 'js'));
    const mainBundle = distJsFiles.find(file => file.startsWith('index.') && file.endsWith('.js'));
    const polyfillBundle = distJsFiles.find(file => file.startsWith('lib-polyfill') && file.endsWith('.js'));
    const vendorBundle = distJsFiles.find(file => file.startsWith('vendors.') && file.endsWith('.js'));

    // Replace any remaining incorrect paths with the actual filenames
    if (mainBundle) {
      indexHtml = indexHtml.replace(/\/static\/js\/index\.[a-f0-9]+\.js/g, `/static/js/${mainBundle}`);
    }
    if (polyfillBundle) {
      indexHtml = indexHtml.replace(/\/static\/js\/lib-polyfill\.[a-f0-9]+\.js/g, `/static/js/${polyfillBundle}`);
    }
    if (vendorBundle) {
      indexHtml = indexHtml.replace(/\/static\/js\/vendors\.[a-f0-9]+\.js/g, `/static/js/${vendorBundle}`);
    }

    // Update the title in the HTML
    indexHtml = indexHtml.replace(
      /<title>[^<]*<\/title>/,
      '<title>Rust WebUI Application</title>'
    );

    // Write updated index.html
    await fs.writeFile('./dist/index.html', indexHtml);

    console.log('Frontend build completed successfully!');
    console.log('Output: frontend/dist/');
  } catch (error) {
    console.error('Error during frontend build:', error);
    process.exit(1);
  } finally {
    process.chdir(originalDir); // Change back to original directory
  }
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

buildFrontend();
