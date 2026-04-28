const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('fs-extra');
const webpack = require('webpack');

const WebpackConfigGeneratorModule = require('@electron-forge/plugin-webpack/dist/WebpackConfig');
const forgeConfig = require('../forge.config');

const WebpackConfigGenerator =
  WebpackConfigGeneratorModule.default || WebpackConfigGeneratorModule;

const projectDir = path.resolve(__dirname, '..');
const webpackDir = path.join(projectDir, '.webpack');

function getWebpackPluginConfig() {
  const plugin = forgeConfig.plugins.find(
    (entry) => entry && entry.name === '@electron-forge/plugin-webpack',
  );

  if (!plugin || !plugin.config) {
    throw new Error('Nao foi possivel localizar a configuracao do @electron-forge/plugin-webpack.');
  }

  return plugin.config;
}

function compile(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      if (!stats) {
        reject(new Error('Webpack finalizou sem retornar estatisticas.'));
        return;
      }

      process.stdout.write(
        `${stats.toString({
          colors: true,
          chunks: false,
          modules: false,
        })}\n`,
      );

      if (stats.hasErrors()) {
        reject(new Error('A compilacao do webpack terminou com erros.'));
        return;
      }

      resolve();
    });
  });
}

async function buildApp() {
  const pluginConfig = getWebpackPluginConfig();
  const generator = new WebpackConfigGenerator(
    pluginConfig,
    projectDir,
    true,
    pluginConfig.port || 3000,
  );

  await fs.remove(webpackDir);

  console.log('Compilando processo principal...');
  await compile(await generator.getMainConfig());

  const rendererGroups = Array.isArray(pluginConfig.renderer)
    ? pluginConfig.renderer
    : [pluginConfig.renderer];

  for (const rendererOptions of rendererGroups) {
    const rendererConfigs = await generator.getRendererConfig(rendererOptions);

    for (const rendererConfig of rendererConfigs) {
      console.log(`Compilando renderer (${rendererConfig.target})...`);
      await compile(rendererConfig);
    }
  }
}

async function launchElectron() {
  const electronPath = require('electron');
  const child = spawn(electronPath, ['.'], {
    cwd: projectDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error('Falha ao abrir o Electron:', error);
    process.exit(1);
  });
}

async function main() {
  await buildApp();

  if (process.env.IUPI_SKIP_ELECTRON === '1') {
    console.log('Build concluido. Execucao do Electron ignorada por IUPI_SKIP_ELECTRON=1.');
    return;
  }

  await launchElectron();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
