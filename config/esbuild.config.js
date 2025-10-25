const esbuild = require('esbuild');
const { cleanDirectoryPlugin } = require('./esbuild/cleanDirectoryPlugin');
const { virtualEntryPlugin } = require('./esbuild/virtualEntryPlugin');
const { pugPlugin } = require('./esbuild/pugPlugin');
const { generateManifestPlugin } = require('./esbuild/generateManifestPlugin');
const { smartCopyNpmDependenciesPlugin } = require('./esbuild/smartCopyNpmDependenciesPlugin');
const { copy } = require('esbuild-plugin-copy');
const { getEntryPointsFromManifest } = require('./esbuild/getEntryPoints');


const outdir = 'dist';
const watchMode = process.argv.includes('--watch');
const staticAssetsConfig = [
  {
    from: 'assets/**/*',
    to: './assets',
  },
  {
    from: ['./LICENSE'],
    to: ['./'],
  }
];

const manifestData = getEntryPointsFromManifest();

const buildOptions = {
  entryPoints: manifestData.entryPoints,
  bundle: true,
  outdir: outdir,
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  minify: process.env.APP_MODE === 'prod' && process.env.TARGET_BROWSER !== 'firefox',
  sourcemap: process.env.APP_MODE !== 'prod',
  plugins: [
    cleanDirectoryPlugin(outdir),
    virtualEntryPlugin(manifestData.virtualEntries),
    pugPlugin(manifestData.pugFiles, watchMode),

    // NOUVEAU: Plugin intelligent qui parse les Pug et copie les dépendances
    smartCopyNpmDependenciesPlugin({
      outputDir: 'dist/js',
      nodeModulesPath: './node_modules',
      pugFiles: manifestData.pugFiles // Passer la liste des fichiers Pug
    }),

    generateManifestPlugin(process.env.TARGET_BROWSER || 'chrome'),
    copy({
      assets: staticAssetsConfig,
      watch: watchMode,
    }),
  ]
};

async function build() {
  try {
    await esbuild.build(buildOptions);
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  try {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('👀 Watching for changes...');
  } catch (error) {
    console.error('❌ Watch failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const isWatch = process.argv.includes('--watch');
  if (isWatch) {
    watch();
  } else {
    build();
  }
}
