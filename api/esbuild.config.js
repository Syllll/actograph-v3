/**
 * esbuild configuration for bundling the NestJS API
 * 
 * This bundles the entire API into a single JavaScript file,
 * dramatically reducing the number of files needed for deployment.
 * 
 * Native modules (better-sqlite3) are externalized and must be
 * provided separately with their prebuilds.
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Read package.json to get dependencies
const packageJson = require('./package.json');
const dependencies = Object.keys(packageJson.dependencies || {});

// Native modules that cannot be bundled - they require platform-specific binaries
const nativeModules = [
  'better-sqlite3',
  // Add any other native modules here if needed
];

// Modules that should be externalized (not bundled)
// - Native modules (require platform-specific binaries)
// - Modules that have issues with bundling
const externalModules = [
  ...nativeModules,
  // NestJS optional dependencies that we don't use
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@nestjs/platform-socket.io',
  'cache-manager',
  'class-transformer/storage',
  // Optional peer dependencies
  '@apollo/subgraph',
  'ts-morph',
];

async function build() {
  console.log('Building API bundle with esbuild...');
  
  const startTime = Date.now();

  try {
    const result = await esbuild.build({
      // Entry point - the main NestJS file
      entryPoints: ['./dist/src/main.js'],
      
      // Output configuration
      bundle: true,
      outfile: './dist/api.bundle.js',
      
      // Platform and target
      platform: 'node',
      target: 'node20',
      
      // External modules (not bundled)
      external: externalModules,
      
      // Source maps for debugging (optional, can be removed for smaller size)
      sourcemap: false,
      
      // Minification (disabled for easier debugging, enable for smaller size)
      minify: false,
      
      // Keep names for NestJS decorators and reflection
      keepNames: true,
      
      // Format
      format: 'cjs',
      
      // Banner to handle __dirname and __filename in ESM context if needed
      banner: {
        js: `
// esbuild banner - fix for __dirname/__filename if needed
const __bundle_dirname = __dirname;
const __bundle_filename = __filename;
        `.trim(),
      },
      
      // Plugins for handling specific cases
      plugins: [
        // Plugin to handle .node native addon files
        {
          name: 'native-node-modules',
          setup(build) {
            // Mark all .node files as external
            build.onResolve({ filter: /\.node$/ }, (args) => {
              return { path: args.path, external: true };
            });
          },
        },
      ],
      
      // Log level
      logLevel: 'info',
      
      // Metafile for analysis (optional)
      metafile: true,
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Get bundle size
    const bundlePath = './dist/api.bundle.js';
    const stats = fs.statSync(bundlePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\n✅ Bundle created successfully!`);
    console.log(`   Output: ${bundlePath}`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Time: ${duration}s`);
    
    // Write metafile for analysis
    if (result.metafile) {
      fs.writeFileSync(
        './dist/api.bundle.meta.json',
        JSON.stringify(result.metafile, null, 2)
      );
      console.log(`   Metafile: ./dist/api.bundle.meta.json`);
    }
    
    // List external modules that were excluded
    console.log(`\n📦 External modules (not bundled):`);
    externalModules.forEach(mod => console.log(`   - ${mod}`));
    
    console.log(`\n⚠️  Note: You need to include these native modules alongside the bundle:`);
    nativeModules.forEach(mod => console.log(`   - ${mod}`));
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
