/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { configure } = require('quasar/wrappers');
const path = require('path');

const packageJson = require('./package.json');
const version = packageJson.version || '0.0.1';
const appname = packageJson.name;

module.exports = configure(function (ctx) {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['i18n', 'capacitor', 'database'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      'mdi-v7',
      'material-icons',
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20',
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'

      extendViteConf(viteConf) {
        Object.assign(viteConf.resolve.alias, {
          '~': path.resolve(__dirname, './src'),
          '@boot': path.resolve(__dirname, './src/boot'),
          '@assets': path.resolve(__dirname, './src/assets'),
          '@css': path.resolve(__dirname, './src/css'),
          '@i18n': path.resolve(__dirname, './src/i18n'),
          '@layouts': path.resolve(__dirname, './src/layouts'),
          '@pages': path.resolve(__dirname, './src/pages'),
          '@router': path.resolve(__dirname, './src/router'),
          '@services': path.resolve(__dirname, './src/services'),
          '@components': path.resolve(__dirname, './src/components'),
          '@utils': path.resolve(__dirname, './src/utils'),
          '@database': path.resolve(__dirname, './src/database'),
          '@composables': path.resolve(__dirname, './src/composables'),
          // Packages partagés : importer depuis src/ (pas dist/) pour le développement
          // Avantages : hot-reload, erreurs TS immédiates, pas de rebuild nécessaire
          // En production, le bundler utilise automatiquement dist/ via package.json (main/types)
          '@actograph/core': path.resolve(__dirname, '../packages/core/src'),
          '@actograph/graph': path.resolve(__dirname, '../packages/graph/src'),
          // Force pixi.js to resolve from mobile's node_modules
          'pixi.js': path.resolve(__dirname, 'node_modules/pixi.js'),
        });

        // Ensure pixi.js is pre-bundled
        // PixiJS v8 is a single package (no longer split into @pixi/* modules)
        viteConf.optimizeDeps = viteConf.optimizeDeps || {};
        viteConf.optimizeDeps.include = viteConf.optimizeDeps.include || [];
        viteConf.optimizeDeps.include.push('pixi.js');

        // Force esbuild to bundle pixi.js completely (avoid dynamic imports issues)
        viteConf.optimizeDeps.esbuildOptions = viteConf.optimizeDeps.esbuildOptions || {};
        viteConf.optimizeDeps.esbuildOptions.target = 'es2020';

        // Ensure SSR doesn't externalize pixi.js
        viteConf.ssr = viteConf.ssr || {};
        viteConf.ssr.noExternal = viteConf.ssr.noExternal || [];
        if (Array.isArray(viteConf.ssr.noExternal)) {
          viteConf.ssr.noExternal.push('pixi.js');
        }
      },

      vitePlugins: [
        [
          '@intlify/vite-plugin-vue-i18n',
          {
            include: path.resolve(__dirname, './src/i18n/**'),
          },
        ],
        [
          'vite-plugin-checker',
          {
            vueTsc:
              process.env.NODE_ENV === 'production'
                ? undefined
                : {
                    tsconfigPath: 'tsconfig.vue-tsc.json',
                  },
            eslint: {
              lintCommand: 'eslint "./**/*.{js,ts,mjs,cjs,vue}"',
            },
          },
          { server: false },
        ],
      ],

      env: {
        APP_VERSION: version,
        APP_NAME: appname,
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      open: false,
      //host: '0.0.0.0', // Listen on all interfaces for emulator access
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {
        // Dark mode configuration
        dark: 'auto',
        // Brand colors aligned with front/
        brand: {
          primary: '#1f2937',   // modernDarkGrey
          secondary: '#64748b', // slate
          accent: '#f97316',    // orange
          positive: '#10b981',  // green
          negative: '#ef4444',  // red
          warning: '#f59e0b',   // amber
          info: '#3b82f6',      // blue
        },
      },

      // Quasar plugins
      plugins: ['Notify', 'Dialog', 'Screen', 'Loading', 'LocalStorage'],
    },

    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
      capacitorCliPreparationParams: ['sync', ctx.targetName],
    },

    // Path to IDE executables
    bin: {
      linuxAndroidStudio: process.env.CAPACITOR_ANDROID_STUDIO_PATH,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#sourcefiles
    sourceFiles: {
      rootComponent: 'src/App.vue',
      router: 'src/router/index',
    },
  };
});

