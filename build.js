const esbuild = require('esbuild');
const { cleanDirectoryPlugin } = require('./config/esbuild/plugins/cleanDirectoryPlugin');
const { generateManifestPlugin } = require('./config/esbuild/plugins/generateManifestPlugin');
const { pugPlugin } = require('./config/esbuild/plugins/pugPlugin');
const { pugInlinePlugin } = require('./config/esbuild/plugins/pugInlinePlugin');
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

// Extraction générique des entry points depuis le manifest
function getEntryPointsFromManifest() {
  const manifestPath = `src/manifest.json`;

  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️  Manifest non trouvé: ${manifestPath}`);
    return [];
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = [];

  // Fonction utilitaire pour ajouter un fichier s'il existe et est un fichier source
  function addSourceFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return;

    // Vérifier si c'est un fichier source (.coffee ou .pug)
    if (filePath.endsWith('.coffee') || filePath.endsWith('.pug')) {
      if (fs.existsSync(filePath)) {
        entries.push(filePath);
        console.log(`✅ Entry point trouvé: ${filePath}`);
      } else {
        console.warn(`⚠️  Entry point manquant: ${filePath}`);
      }
    }
  }

  // Fonction récursive pour parcourir toutes les propriétés du manifest
  function scanManifestProperties(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        // Traiter les chemins de fichiers directs
        addSourceFile(value);
      } else if (Array.isArray(value)) {
        // Traiter les tableaux de fichiers
        value.forEach(item => {
          if (typeof item === 'string') {
            addSourceFile(item);
          } else if (typeof item === 'object' && item !== null) {
            scanManifestProperties(item, currentPath);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Récursion pour les objets imbriqués
        scanManifestProperties(value, currentPath);
      }
    }
  }

  // Scanner tout le manifest
  scanManifestProperties(manifest);

  console.log('📄 Entry points détectés:', entries);
  return entries;
}

// Configuration esbuild
const options = {
  entryPoints: getEntryPointsFromManifest().filter(entry => entry.endsWith('.coffee')),
  bundle: true,
  outdir: outdir,
  // minify: appMode === 'prod',
  minify: false,
  sourcemap: appMode === 'dev',
  platform: 'browser',
  target: targetBrowser === 'firefox' ? ['firefox89'] : ['chrome89'],
  format: 'iife',
  logLevel: 'info',
  entryNames: '[dir]/[name]', // Préserver la structure des dossiers
  loader: {
    '.coffee': 'js', // Dire à ESBuild de traiter .coffee comme du JS après transformation
  },
  define: {
    'APP_MODE': `"${appMode}"`,
    'APP_TARGET': `"${targetBrowser}"`,
    'APP_VERSION': `"${appVersion}"`,
  },
  plugins: [
    cleanDirectoryPlugin(outdir),
    pugInlinePlugin,
    coffeeScriptPlugin,
    pugPlugin(getEntryPointsFromManifest().filter(entry => entry.endsWith('.pug'))),
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
