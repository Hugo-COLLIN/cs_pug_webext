const esbuild = require('esbuild');
const { cleanDirectoryPlugin } = require('./config/esbuild/plugins/cleanDirectoryPlugin');
const { generateManifestPlugin } = require('./config/esbuild/plugins/generateManifestPlugin');
const { pugPlugin } = require('./config/esbuild/plugins/pugPlugin');
const { coffeeScriptPlugin } = require('./config/esbuild/plugins/coffeeScriptPlugin');
const { copy } = require('esbuild-plugin-copy');
const fs = require('fs');
const path = require('path');

// Configuration environnement
const outdir = 'dist';
const targetBrowser = process.env.TARGET || 'chrome';
const appMode = process.env.APP_MODE || 'dev';
const appVersion = require('./package.json').version;
const watchMode = process.argv.includes('--watch');

// Assets statiques à copier
const staticAssetsConfig = [
  {
    from: 'public/**/*',
    to: './',
  },
  {
    from: 'src/styles/**/*.css',
    to: './styles/',
  }
];

// Découverte automatique des entry points
function getEntryPoints() {
  const entrypointsDir = 'src/entrypoints';
  const entries = [];

  if (fs.existsSync(entrypointsDir)) {
    const files = fs.readdirSync(entrypointsDir);
    files.forEach(file => {
      if (file.endsWith('.coffee')) {
        entries.push(path.join(entrypointsDir, file));
      }
    });
  }

  // Ajouter les templates Pug comme entry points virtuels
  const templatesDir = 'src/templates';
  if (fs.existsSync(templatesDir)) {
    const templates = fs.readdirSync(templatesDir);
    templates.forEach(file => {
      if (file.endsWith('.pug')) {
        entries.push(path.join(templatesDir, file));
      }
    });
  }

  console.log('📄 Entry points découverts:', entries);
  return entries;
}

// Configuration esbuild
const options = {
  entryPoints: getEntryPoints(),
  bundle: true,
  outdir: outdir,
  minify: appMode === 'prod',
  sourcemap: appMode === 'dev',
  platform: 'browser',
  target: targetBrowser === 'firefox' ? ['firefox89'] : ['chrome89'],
  format: 'iife',
  logLevel: 'info',
  entryNames: '[name]',
  define: {
    'APP_MODE': `"${appMode}"`,
    'APP_TARGET': `"${targetBrowser}"`,
    'APP_VERSION': `"${appVersion}"`,
  },
  plugins: [
    cleanDirectoryPlugin(outdir),
    coffeeScriptPlugin,
    pugPlugin,
    generateManifestPlugin(targetBrowser, appVersion),
    copy({
      assets: staticAssetsConfig,
      watch: watchMode,
    }),
  ],
};

// Fonction principale
const job = watchMode ? watch : build;

job().catch((error) => {
  console.error('❌ Build failed:', error);
  console.error('Stack Trace:', error.stack);
  process.exit(1);
});

async function build() {
  console.log(`🚀 Building for ${targetBrowser} (${appMode} mode)...`);
  await esbuild.build(options);
  console.log('✅ Build completed successfully');
}

async function watch() {
  console.log(`👀 Watching for ${targetBrowser} (${appMode} mode)...`);
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('🔄 Watching for file changes...');

  // Garder le processus actif
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping watch mode...');
    await ctx.dispose();
    process.exit(0);
  });
}
