/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { configure } = require('quasar/wrappers');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs-extra');

const packageJson = fs.readFileSync('./package.json');
const version = JSON.parse(packageJson).version || 0;
const appname = JSON.parse(packageJson).name;

// Required to parse .env file
require('dotenv').config();

module.exports = configure(function (/* ctx */) {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['amcharts', 'lib-improba'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      //'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20',
      },

      vueRouterMode: process.env.VUE_ROUTER_MODE ?? 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      extendViteConf(viteConf, { isServer, isClient }) {
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
          '@lib-improba': path.resolve(__dirname, './lib-improba'),
          // Packages partagés : importer depuis src/ (pas dist/) pour le développement
          // Avantages : hot-reload, erreurs TS immédiates, pas de rebuild nécessaire
          // En production, le bundler utilise automatiquement dist/ via package.json (main/types)
          '@actograph/core': path.resolve(__dirname, '../packages/core/src'),
          '@actograph/graph': path.resolve(__dirname, '../packages/graph/src'),
        });
      },

      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/vite-plugin-vue-i18n',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            // you need to set i18n resource including paths !
            include: path.resolve(__dirname, './src/i18n/**'),
          },
        ],
        [
          'vite-plugin-checker',
          {
            // Disable the plugin in production because of errors
            // @TODO: fix the errors
            vueTsc:
              process.env.NODE_ENV === 'production'
                ? undefined
                : {
                    tsconfigPath: 'tsconfig.vue-tsc.json',
                  },
            eslint: {
              lintCommand:
                'eslint "./**/*.{js,ts,mjs,cjs,vue}" --ignore-pattern "src-electron/extra-resources/*"',
            },
          },
          { server: false },
        ],
      ],
      // Prefer dart-sass over deprecated node-sass for speed and compatibility
      scss: {
        additionalData: '',
      },
      env: {
        // dev
        API_URL: process.env.API_URL, // 'http://localhost:3000',
        APP_VERSION: version,
        APP_NAME: appname,
        VUE_ROUTER_MODE: process.env.VUE_ROUTER_MODE || 'hash',
        DEFAULT_COLOR_MODE: process.env.DEFAULT_COLOR_MODE || 'light',
        AMCHART5_LICENCE_KEY: process.env.AMCHART5_LICENCE_KEY,
      },
      beforeBuild: (ctx) => {
        if (ctx.dev) {
          return;
        }

        console.log('Building API with esbuild bundling...');
        const promise = new Promise((resolve, reject) => {
          const buildApi = async () => {
            try {
              // Change directory to api and install dev+prod dependencies to allow building (nest, etc.)
              process.chdir('../api');
              await new Promise((resolve, reject) => {
                // Force dev dependencies to be installed for the build phase
                // (explicit flag overrides environment like NODE_ENV=production)
                spawn('yarn', ['install', '--production=false'], {
                  stdio: 'inherit',
                  shell: true,
                }).on('close', (code) =>
                  code === 0 ? resolve() : reject(code)
                );
              });

              // Clean and build using local binaries (avoid npx on CI)
              // Note: On Windows, .bin contains .cmd files which are resolved by shell automatically
              const binPath = path.join(process.cwd(), 'node_modules', '.bin');
              
              // Helper to get the correct binary path
              // On Windows with shell: true, cmd.exe will resolve .cmd automatically
              const getBinPath = (name) => path.join(binPath, name);

              await new Promise((resolve, reject) => {
                spawn(getBinPath('rimraf'), ['dist'], {
                  stdio: 'inherit',
                  shell: true,
                }).on('close', (code) =>
                  code === 0 ? resolve() : reject(code)
                );
              });

              // Step 1: Generate entity and migration indexes (auto-discovery)
              console.log('Step 1/4: Generating entity and migration indexes...');
              await new Promise((resolve, reject) => {
                spawn('node', ['scripts/generate-indexes.js'], {
                  stdio: 'inherit',
                  shell: true,
                }).on('close', (code) =>
                  code === 0 ? resolve() : reject(code)
                );
              });

              // Step 2: Build with NestJS (TypeScript → JavaScript)
              console.log('Step 2/4: Building with NestJS...');
              await new Promise((resolve, reject) => {
                spawn(getBinPath('nest'), ['build'], {
                  stdio: 'inherit',
                  shell: true,
                }).on('close', (code) =>
                  code === 0 ? resolve() : reject(code)
                );
              });

              // Step 3: Bundle with esbuild (many JS files → single bundle)
              console.log('Step 3/4: Bundling with esbuild...');
              await new Promise((resolve, reject) => {
                spawn('node', ['esbuild.config.js'], {
                  stdio: 'inherit',
                  shell: true,
                }).on('close', (code) =>
                  code === 0 ? resolve() : reject(code)
                );
              });

              // Change back to front directory
              process.chdir('../front');

              // Clean destination directory where the API will be embedded in the Electron app
              await fs.remove('./src-electron/extra-resources/api');

              // Create destination directory
              await fs.ensureDir('./src-electron/extra-resources/api');

              // Step 4: Copy only the bundle and native modules
              console.log('Step 4/4: Copying bundle and native modules...');
              
              // Copy the bundled API (single file!)
              await fs.copy(
                '../api/dist/api.bundle.js',
                './src-electron/extra-resources/api/api.bundle.js'
              );

              // Copy only the native modules (better-sqlite3) with their prebuilds
              // These cannot be bundled and must be provided separately
              const nativeModules = ['better-sqlite3'];
              const os = require('os');
              const prodInstallDir = path.join(
                os.tmpdir(),
                'actograph-api-native-deps'
              );

              // Prepare a minimal package.json with only native dependencies
              await fs.remove(prodInstallDir);
              await fs.ensureDir(prodInstallDir);
              
              const nativePackageJson = {
                name: 'actograph-native-deps',
                version: '1.0.0',
                dependencies: {}
              };
              
              // Read the original package.json to get exact versions
              const apiPackageJson = require('../api/package.json');
              for (const mod of nativeModules) {
                if (apiPackageJson.dependencies[mod]) {
                  nativePackageJson.dependencies[mod] = apiPackageJson.dependencies[mod];
                }
              }
              
              await fs.writeJson(path.join(prodInstallDir, 'package.json'), nativePackageJson);

              // Install only native dependencies
              await new Promise((resolve, reject) => {
                spawn('yarn', ['install', '--production=true'], {
                  stdio: 'inherit',
                  shell: true,
                  cwd: prodInstallDir,
                }).on('close', (code) =>
                  code === 0 ? resolve() : reject(code)
                );
              });

              // Copy native node_modules
              await fs.copy(
                path.join(prodInstallDir, 'node_modules'),
                './src-electron/extra-resources/api/node_modules'
              );

              // Copy environment file if present
              if (await fs.pathExists('../api/.env')) {
                await fs.copy(
                  '../api/.env',
                  './src-electron/extra-resources/api/.env'
                );
              }

              // Cleanup temporary install directory
              await fs.remove(prodInstallDir);

              // Log the result
              const bundleStats = require('fs').statSync('./src-electron/extra-resources/api/api.bundle.js');
              console.log(`\n✅ API build complete!`);
              console.log(`   Bundle size: ${(bundleStats.size / 1024 / 1024).toFixed(2)} MB`);
              console.log(`   Native modules: ${nativeModules.join(', ')}`);

              resolve();
            } catch (error) {
              console.error('Build failed:', error);
              reject(error);
            }
          };

          buildApi();
        });
        return promise;
      },
      afterBuild: ({ quasarConf }) => {},
      beforeDev: ({ quasarConf }) => {},
      afterDev: ({ quasarConf }) => {},
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      // https: true
      //open: true, // opens browser window automatically
      client: {
        webSocketURL: `ws://0.0.0.0:${process.env.FRONT_DOCKER_PORT_EXPOSED}/ws`,
      },
      port:
        process.env.FRONT_DOCKER_PORT_EXPOSED &&
        process.env.FRONT_DOCKER_PORT_EXPOSED !== ''
          ? parseInt(process.env.FRONT_DOCKER_PORT_EXPOSED)
          : 8080,
      strictPort: true, // throws error if port is already in use
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      // Notify: Print notification
      // Dialog: Dialog box
      // Screen: Screen information
      // Meta: Meta information for SEO
      plugins: ['Notify', 'Dialog', 'Screen', 'Meta'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   registerServiceWorker: 'src-pwa/register-service-worker',
    //   serviceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      // ssrPwaHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // will mess up SSR

      // extendSSRWebserverConf (esbuildConf) {},
      // extendPackageJson (json) {},

      pwa: false,
      prefetch: true,

      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render', // keep this as last one
      ],
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'generateSW', // or 'injectManifest'
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
      // useFilenameHashes: true,
      // extendGenerateSWOptions (cfg) {}
      // extendInjectManifestOptions (cfg) {},
      // extendManifestJson (json) {}
      // extendPWACustomSWConf (esbuildConf) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      extendElectronMainConf(esbuildConf) {
        // Ajouter les arguments pour désactiver le sandbox sur Linux
        if (process.platform === 'linux') {
          // Ces arguments seront passés au processus Electron
          process.env.ELECTRON_DISABLE_SANDBOX = '1';
        }
      },
      // extendElectronMainConf (esbuildConf)
      // extendElectronPreloadConf (esbuildConf)

      inspectPort: 5858,

      bundler: 'builder', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'actograph-v3',
        extraResources: ['./src-electron/extra-resources/**'],
        // We do not use the version in the artifact name, because we want to be able to
        // use the same artifact name for different versions.
        artifactName: 'ActoGraph-v3-${arch}.${ext}', // 'ActoGraph-v3-${version}.${ext}',
        productName: 'ActoGraph-v3',
        copyright: '©2025 SymAlgo Technologies',
        mac: {
          category: 'public.app-category.utilities',
          target: [
            // We build for both arch but not here, directly in the workflow github
            { target: 'dmg' },
          ],
          // Use store compression for faster builds (like Windows)
          // Trade-off: slightly larger file size but much faster build
          compression: 'store',
          // Explicitly disable code signing to avoid retries and delays
          // Without this, electron-builder tries to sign, fails, and retries multiple times
          identity: null,
          gatekeeperAssess: false,
        },
        win: {
          target: 'nsis',
          // Valid compression values are: "maximum", "normal", "store"
          // store: fastest but biggest size
          // normal: default
          // maximum: slow and smallest size
          compression: 'store',
          // Only include certificate configuration when the password is available
          ...(process.env.WIN_CERT_PWD
            ? {
                certificateFile:
                  process.env.CERTIFICATE_PATH || './certificate.pfx',
                certificatePassword: process.env.WIN_CERT_PWD,
                signAndEditExecutable: true,
                publisherName: 'SymAlgo Technologies', // Fallback publisher name
              }
            : {}),
        },
        nsis: {
          // Note: With the bundled API approach, no extraction is needed at all.
          // The API is bundled into a single file (api.bundle.js) with only
          // native modules (better-sqlite3) as separate node_modules.
          // This results in instant startup without any first-launch extraction.
        },
        linux: {
          target: ['AppImage'],
          category: 'Utility',
        },
        publish: [
          {
            provider: 'github',
            owner: 'Syllll',
            repo: 'actograph-v3',
          },
        ],
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      contentScripts: ['my-content-script'],

      // extendBexScriptsConf (esbuildConf) {}
      // extendBexManifestJson (json) {}
    },
  };
});
