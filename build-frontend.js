#!/usr/bin/env node

import fs from 'fs/promises';
import { execSync, spawn } from 'child_process';
import path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const STAGES = {
  START: 'START',
  DEPS: 'DEPS',
  BUILD: 'BUILD',
  OPTIMIZE: 'OPTIMIZE',
  STATS: 'STATS',
  COPY: 'COPY',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
};

class BuildLogger {
  constructor(logDir = null) {
    this.startTime = Date.now();
    this.stages = [];
    this.currentStage = null;
    this.stageStartTime = null;
    this.logDir = logDir;
    this.logFile = null;
    
    if (this.logDir) {
      this.initFileLogging();
    }
  }

  async initFileLogging() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = path.join(this.logDir, `frontend-build-${timestamp}.log`);
    } catch (e) {
      console.warn('Failed to initialize file logging:', e.message);
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  getElapsed() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  }

  format(level, message) {
    const time = new Date().toISOString();
    return `[${time}] [${level.padEnd(5)}] ${message}`;
  }

  async writeToFile(entry) {
    if (!this.logFile) return;
    try {
      await fs.appendFile(this.logFile, entry + '\n');
    } catch (e) {
      // Silently ignore
    }
  }

  async log(level, message, stage = null) {
    const entry = this.format(level, message);
    const formatted = this.getFormattedEntry(level, message);
    
    console.log(formatted);
    await this.writeToFile(entry);

    if (stage) {
      this.completeStage(stage, level === 'ERROR' ? 'failed' : 'success');
    }
  }

  getFormattedEntry(level, message) {
    const elapsed = this.getElapsed();
    let color = COLORS.white;
    let prefix = '[BUILD]';

    switch (level) {
      case 'INFO':
        color = COLORS.cyan;
        break;
      case 'WARN':
        color = COLORS.yellow;
        break;
      case 'ERROR':
        color = COLORS.red;
        prefix = '[FAIL]';
        break;
      case 'SUCCESS':
        color = COLORS.green;
        prefix = '[DONE]';
        break;
      case 'STEP':
        color = COLORS.blue;
        break;
      case 'DEBUG':
        color = COLORS.gray;
        break;
    }

    return `${COLORS.gray}[${elapsed}s]${COLORS.reset} ${color}${prefix}${COLORS.reset} ${message}`;
  }

  startStage(stage) {
    this.currentStage = stage;
    this.stageStartTime = Date.now();
    this.stages.push({ name: stage, status: 'running', startTime: this.stageStartTime });
    this.log('STEP', `Starting: ${stage}`, stage);
  }

  completeStage(stage, status) {
    const stageData = this.stages.find(s => s.name === stage);
    if (stageData) {
      stageData.status = status;
      stageData.duration = Date.now() - stageData.startTime;
    }
    this.currentStage = null;
  }

  info(message) {
    return this.log('INFO', message);
  }

  warn(message) {
    return this.log('WARN', message);
  }

  error(message) {
    return this.log('ERROR', message);
  }

  success(message) {
    return this.log('SUCCESS', message);
  }

  debug(message) {
    if (process.env.DEBUG) {
      return this.log('DEBUG', message);
    }
  }

  async printSummary() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    console.log('\n' + COLORS.bright + '='.repeat(60) + COLORS.reset);
    console.log(COLORS.bright + '                    BUILD SUMMARY' + COLORS.reset);
    console.log(COLORS.bright + '='.repeat(60) + COLORS.reset);
    console.log(`Total Time: ${COLORS.cyan}${totalTime}s${COLORS.reset}\n`);
    
    for (const stage of this.stages) {
      const duration = (stage.duration / 1000).toFixed(2);
      let statusIcon = COLORS.gray + '○' + COLORS.reset;
      let statusColor = COLORS.gray;

      switch (stage.status) {
        case 'success':
          statusIcon = COLORS.green + '✓' + COLORS.reset;
          statusColor = COLORS.green;
          break;
        case 'failed':
          statusIcon = COLORS.red + '✗' + COLORS.reset;
          statusColor = COLORS.red;
          break;
        case 'running':
          statusIcon = COLORS.blue + '⟳' + COLORS.reset;
          statusColor = COLORS.blue;
          break;
      }

      console.log(`  ${statusIcon} ${stage.name.padEnd(20)} ${statusColor}${duration}s${COLORS.reset}`);
    }

    console.log(COLORS.bright + '='.repeat(60) + COLORS.reset);

    if (this.logFile) {
      console.log(`\n${COLORS.gray}Log file: ${this.logFile}${COLORS.reset}`);
    }
  }

  async printErrorSummary(error) {
    console.log('\n' + COLORS.red + '!'.repeat(60) + COLORS.reset);
    console.log(COLORS.red + COLORS.bright + '                       BUILD FAILED' + COLORS.reset);
    console.log(COLORS.red + '!'.repeat(60) + COLORS.reset);
    console.log(`\n${COLORS.red}Error:${COLORS.reset} ${error.message}`);
    
    if (error.stack) {
      console.log(`\n${COLORS.gray}Stack trace:${COLORS.reset}`);
      console.log(error.stack.split('\n').slice(0, 5).join('\n'));
    }

    if (this.logFile) {
      console.log(`\n${COLORS.gray}Full log: ${this.logFile}${COLORS.reset}`);
    }
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

function execWithLogging(command, logger, options = {}) {
  logger.debug(`Executing: ${command}`);
  
  try {
    execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd,
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    return true;
  } catch (error) {
    if (!options.silent) {
      logger.error(`Command failed with exit code: ${error.status}`);
    }
    throw error;
  }
}

async function copyWebuiJs(logger, originalDir, frontendDir, originDir) {
  logger.info('Handling WebUI bridge (webui.js)...');
  
  // Validate and normalize paths to prevent directory traversal
  const safeOriginalDir = path.normalize(originalDir);
  
  // Try multiple sources for webui.js - use absolute paths only
  const possibleSources = [
    path.join(safeOriginalDir, 'thirdparty/webui-c-src/bridge/webui.js'),
    path.join(safeOriginalDir, 'node_modules/webui/webui.js'),
    path.join(safeOriginalDir, 'webui.js'),
  ];
  
  let webuiJsSrc = null;
  for (const src of possibleSources) {
    const normalized = path.normalize(src);
    // Ensure path is within the project directory
    if (normalized.startsWith(safeOriginalDir) && await pathExists(normalized)) {
      webuiJsSrc = normalized;
      break;
    }
  }
  
  if (!webuiJsSrc) {
    // Build webui.js from TypeScript source
    logger.info('Building webui.js from TypeScript source...');
    const bridgeDir = path.join(safeOriginalDir, 'thirdparty/webui-c-src/bridge');
    
    try {
      // Use npx with --yes flag to avoid prompts
      execWithLogging('npx --yes esbuild webui.ts --bundle --outfile=webui.js --format=iife --global-name=webui', logger, { cwd: bridgeDir });
      webuiJsSrc = path.join(bridgeDir, 'webui.js');
      logger.success('Built webui.js');
    } catch (err) {
      logger.warn(`Could not build webui.js: ${err.message}`);
      logger.warn('WebUI will serve webui.js dynamically at runtime');
      return;
    }
  } else {
    logger.info(`Found webui.js at: ${webuiJsSrc}`);
  }
  
  // Copy to all output directories - validate each target path
  const outputDirs = [
    path.join(safeOriginalDir, 'static', 'js'),
    path.join(frontendDir, 'dist', 'static', 'js'),
    path.join(originDir, 'static', 'js'),
  ];
  
  for (const outDir of outputDirs) {
    const normalizedOutDir = path.normalize(outDir);
    if (!normalizedOutDir.startsWith(safeOriginalDir)) {
      logger.warn(`Skipping unsafe output directory: ${outDir}`);
      continue;
    }
    
    try {
      await fs.mkdir(normalizedOutDir, { recursive: true });
      const target = path.join(normalizedOutDir, 'webui.js');
      await fs.copyFile(webuiJsSrc, target);
      logger.success(`Copied webui.js to ${path.basename(path.dirname(target))}/`);
    } catch (err) {
      logger.warn(`Could not copy webui.js to ${outDir}: ${err.message}`);
    }
  }
}

async function buildFrontend() {
  const originalDir = process.cwd();
  const frontendDir = path.join(originalDir, 'frontend');
  const logDir = path.join(originalDir, 'logs');
  
  const logger = new BuildLogger(logDir);

  logger.startStage(STAGES.START);
  logger.info('Starting frontend build pipeline');
  logger.debug(`Working directory: ${frontendDir}`);
  logger.debug(`Node version: ${process.version}`);
  logger.debug(`Platform: ${process.platform}`);

  process.chdir(frontendDir);

  try {
    logger.completeStage(STAGES.START, 'success');
    logger.startStage(STAGES.DEPS);

    logger.info('Checking frontend dependencies...');
    
    const depsInstalled = await pathExists('node_modules');
    
    if (!depsInstalled) {
      logger.info('Installing frontend dependencies...');
      execWithLogging('bun install', logger);
      logger.success('Dependencies installed');
    } else {
      const nodeModulesStat = await fs.stat('node_modules');
      logger.info(`Dependencies already installed (${Math.round(nodeModulesStat.size / 1024 / 1024)}MB)`);
    }
    
    logger.completeStage(STAGES.DEPS, 'success');
    logger.startStage(STAGES.BUILD);

    logger.info('Running rsbuild production build...');
    
    const buildStart = Date.now();
    execWithLogging('bun run build:incremental', logger);
    const buildDuration = ((Date.now() - buildStart) / 1000).toFixed(2);
    
    logger.success(`Build completed in ${buildDuration}s`);
    logger.completeStage(STAGES.BUILD, 'success');
    logger.startStage(STAGES.OPTIMIZE);

    logger.info('Flattening JS files...');
    const jsSrcDir = './dist/static/js';
    const jsDestDir = './dist/static/js/';
    await fs.mkdir(jsDestDir, { recursive: true });

    const nestedJsDir = './dist/static/js/static/js/';
    if (await pathExists(nestedJsDir)) {
      const jsFiles = await fs.readdir(nestedJsDir);
      let jsCount = 0;
      for (const file of jsFiles) {
        const srcPath = path.join(nestedJsDir, file);
        const destPath = path.join(jsDestDir, file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          jsCount++;
        }
      }
      logger.success(`Flattened ${jsCount} JS files`);
    }

    logger.info('Flattening CSS files...');
    const cssSrcDir = './dist/static/css';
    const cssDestDir = './dist/static/css/';
    await fs.mkdir(cssDestDir, { recursive: true });

    const nestedCssDir = './dist/static/css/static/css/';
    if (await pathExists(nestedCssDir)) {
      const cssFiles = await fs.readdir(nestedCssDir);
      let cssCount = 0;
      for (const file of cssFiles) {
        const srcPath = path.join(nestedCssDir, file);
        const destPath = path.join(cssDestDir, file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          cssCount++;
        }
      }
      logger.success(`Flattened ${cssCount} CSS files`);
    }
    
    logger.completeStage(STAGES.OPTIMIZE, 'success');
    logger.startStage(STAGES.COPY);

    logger.info('Copying static files to root...');
    const rootStaticDir = path.join(originalDir, 'static');
    await fs.mkdir(path.join(rootStaticDir, 'js'), { recursive: true });
    await fs.mkdir(path.join(rootStaticDir, 'css'), { recursive: true });

    const distJsDir = './dist/static/js/';
    let rootJsCount = 0;
    if (await pathExists(distJsDir)) {
      const rootJsFiles = await fs.readdir(distJsDir);
      for (const file of rootJsFiles) {
        const srcPath = path.join(distJsDir, file);
        const destPath = path.join(rootStaticDir, 'js', file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          rootJsCount++;
        }
      }
    }

    const distCssDir = './dist/static/css/';
    let rootCssCount = 0;
    if (await pathExists(distCssDir)) {
      const rootCssFiles = await fs.readdir(distCssDir);
      for (const file of rootCssFiles) {
        const srcPath = path.join(distCssDir, file);
        const destPath = path.join(rootStaticDir, 'css', file);
        if ((await fs.stat(srcPath)).isFile()) {
          await fs.copyFile(srcPath, destPath);
          rootCssCount++;
        }
      }
    }

    logger.success(`Copied ${rootJsCount} JS and ${rootCssCount} CSS files to root`);

    logger.info('Copying WinBox files to static directories...');
    // Use bundle version which includes CSS
    const winboxJsSrc = './node_modules/winbox/dist/winbox.bundle.min.js'; // Bundle file is in dist root
    const winboxJsSrcMin = './node_modules/winbox/dist/js/winbox.min.js'; // Minified version in js subfolder
    const winboxCssSrc = './node_modules/winbox/dist/css/winbox.min.css';

    // Try to copy the bundle version first, fall back to minified version
    let winboxSourceFile = winboxJsSrc;
    try {
      await fs.access(winboxJsSrc);
    } catch {
      winboxSourceFile = winboxJsSrcMin;
      logger.info('Using minified version of winbox.js instead of bundle');
    }

    try {
      await fs.copyFile(winboxSourceFile, path.join(originalDir, 'static', 'js', 'winbox.min.js'));
      await fs.copyFile(winboxCssSrc, path.join(originalDir, 'static', 'css', 'winbox.min.css'));
      logger.success('Copied WinBox files to static/');
    } catch (err) {
      logger.warn(`Could not copy WinBox files: ${err.message}`);
    }

    try {
      await fs.mkdir(path.join(frontendDir, 'dist', 'static', 'js'), { recursive: true });
      await fs.mkdir(path.join(frontendDir, 'dist', 'static', 'css'), { recursive: true });
      await fs.copyFile(winboxSourceFile, path.join(frontendDir, 'dist', 'static', 'js', 'winbox.min.js'));
      await fs.copyFile(winboxCssSrc, path.join(frontendDir, 'dist', 'static', 'css', 'winbox.min.css'));
      logger.success('Copied WinBox files to dist/');
    } catch (err) {
      logger.warn(`Could not copy WinBox to dist: ${err.message}`);
    }

    const originDir = path.join(originalDir, 'frontend-origin');
    try {
      await fs.mkdir(path.join(originDir, 'static', 'js'), { recursive: true });
      await fs.mkdir(path.join(originDir, 'static', 'css'), { recursive: true });
      await fs.copyFile(winboxSourceFile, path.join(originDir, 'static', 'js', 'winbox.min.js'));
      await fs.copyFile(winboxCssSrc, path.join(originDir, 'static', 'css', 'winbox.min.css'));
      logger.success('Copied WinBox files to frontend-origin/');
    } catch (err) {
      logger.warn(`Could not copy WinBox to frontend-origin: ${err.message}`);
    }

    logger.completeStage(STAGES.COPY, 'success');
    
    // Copy webui.js bridge - Required for WebUI communication
    await copyWebuiJs(logger, originalDir, frontendDir, originDir);
    
    logger.startStage(STAGES.STATS);

    logger.info('Updating index.html paths...');
    let indexHtml = await fs.readFile('./dist/index.html', 'utf8');

    indexHtml = indexHtml.replace(/src="\.\/static\/js\/static\/js\//g, 'src="/static/js/')
                         .replace(/href="\.\/static\/css\/static\/css\//g, 'href="/static/css/');

    const distJsFiles = await fs.readdir(path.join(frontendDir, 'dist', 'static', 'js'));
    const mainBundle = distJsFiles.find(file => file.startsWith('index.') && file.endsWith('.js'));
    const polyfillBundle = distJsFiles.find(file => file.startsWith('lib-polyfill') && file.endsWith('.js'));
    const vendorBundle = distJsFiles.find(file => file.startsWith('vendors.') && file.endsWith('.js'));

    if (mainBundle) {
      indexHtml = indexHtml.replace(/\/static\/js\/index\.[a-f0-9]+\.js/g, `/static/js/${mainBundle}`);
    }
    if (polyfillBundle) {
      indexHtml = indexHtml.replace(/\/static\/js\/lib-polyfill\.[a-f0-9]+\.js/g, `/static/js/${polyfillBundle}`);
    }
    if (vendorBundle) {
      indexHtml = indexHtml.replace(/\/static\/js\/vendors\.[a-f0-9]+\.js/g, `/static/js/${vendorBundle}`);
    }

    indexHtml = indexHtml.replace(
      /<title>[^<]*<\/title>/,
      '<title>Rust WebUI Application</title>'
    );

    await fs.writeFile('./dist/index.html', indexHtml);
    logger.success('Updated index.html');

    const distStat = await fs.stat('./dist');
    logger.info(`Output directory size: ${Math.round(distStat.size / 1024)}KB`);
    
    logger.completeStage(STAGES.STATS, 'success');
    logger.completeStage(STAGES.COMPLETE, 'success');

    await logger.printSummary();
    
    console.log(COLORS.green + '\n✓ Frontend build completed successfully!' + COLORS.reset);
    console.log(COLORS.gray + `  Output: ${path.join(frontendDir, 'dist/')}` + COLORS.reset);

  } catch (error) {
    logger.completeStage(logger.currentStage || 'UNKNOWN', 'failed');
    await logger.printErrorSummary(error);
    await logger.printSummary();
    process.exit(1);
  } finally {
    process.chdir(originalDir);
  }
}

buildFrontend();
