const esbuild = require('esbuild');
const { cleanDirectoryPlugin } = require('./esbuild/cleanDirectoryPlugin');
const { virtualEntryPlugin } = require('./esbuild/virtualEntryPlugin');
const { pugPlugin } = require('./esbuild/pugPlugin');
const { generateManifestPlugin } = require('./esbuild/generateManifestPlugin');
const { copy } = require('esbuild-plugin-copy');


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

const buildOptions = {
  entryPoints: {
    'js/popup': 'virtual:popup',
    'js/background': 'virtual:background',
    'js/content': 'virtual:content'
  },
  bundle: true,
  outdir: outdir,
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  minify: process.env.NODE_ENV === 'production' && process.env.TARGET !== 'firefox',
  sourcemap: process.env.NODE_ENV !== 'production',
  plugins: [
    cleanDirectoryPlugin(outdir),
    virtualEntryPlugin,
    pugPlugin(['src/Popup/popup.pug'], watchMode),
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
