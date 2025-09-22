const esbuild = require('esbuild');
const pug = require('pug');
const fs = require('fs');
const path = require('path');

// Plugin pour traiter les fichiers Pug
const pugPlugin = {
  name: 'pug',
  setup(build) {
    build.onLoad({ filter: /\.pug$/ }, async (args) => {
      const pugContent = await fs.promises.readFile(args.path, 'utf8');
      const html = pug.render(pugContent, {
        filename: args.path,
        pretty: true
      });

      const outputPath = args.path.replace(/src\//, 'dist/').replace(/\.pug$/, '.html');
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.promises.writeFile(outputPath, html);

      return { contents: '', loader: 'js' };
    });
  }
};

// Fonction de build
async function build() {
  try {
    console.log('🔧 Démarrage du build...');

    // Nettoyer le dossier dist
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    // Liste des fichiers CoffeeScript possibles
    const possibleCoffeeFiles = [
      'src/background/background.coffee',
      'src/content/content.coffee',
      'src/popup/popup.coffee',
      'src/options/options.coffee'
    ];

    // Filtrer les fichiers CoffeeScript qui existent réellement
    const existingCoffeeFiles = possibleCoffeeFiles.filter(file => fs.existsSync(file));
    console.log('📄 Fichiers CoffeeScript trouvés:', existingCoffeeFiles);

    // Compiler CoffeeScript vers JS temporaire
    const jsEntryPoints = [];
    for (const coffeeFile of existingCoffeeFiles) {
      console.log(`☕ Compilation de ${coffeeFile}...`);
      const coffee = require('coffeescript');
      const coffeeContent = fs.readFileSync(coffeeFile, 'utf8');
      const jsContent = coffee.compile(coffeeContent, { bare: true });

      const jsFile = coffeeFile.replace('.coffee', '.js');
      fs.writeFileSync(jsFile, jsContent);
      jsEntryPoints.push(jsFile);
    }

    // Traiter les fichiers Pug
    const possiblePugFiles = [
      'src/popup/popup.pug',
      'src/options/options.pug'
    ];

    const existingPugFiles = possiblePugFiles.filter(file => fs.existsSync(file));
    console.log('🐶 Fichiers Pug trouvés:', existingPugFiles);

    for (const pugFile of existingPugFiles) {
      console.log(`🐶 Compilation de ${pugFile}...`);
      const pugContent = fs.readFileSync(pugFile, 'utf8');
      const html = pug.render(pugContent, {
        filename: pugFile,
        pretty: true
      });

      const htmlFile = pugFile.replace('src/', 'dist/').replace('.pug', '.html');
      fs.mkdirSync(path.dirname(htmlFile), { recursive: true });
      fs.writeFileSync(htmlFile, html);
    }

    // Build avec esBuild seulement si on a des entry points
    if (jsEntryPoints.length > 0) {
      console.log('⚡ Build esBuild avec les entry points:', jsEntryPoints);

      await esbuild.build({
        entryPoints: jsEntryPoints,
        bundle: true,
        outdir: 'dist',
        format: 'iife',
        target: 'chrome88',
        define: {
          'process.env.NODE_ENV': '"production"'
        }
      });
    } else {
      console.log('⚠️  Aucun fichier CoffeeScript trouvé, passage du build esBuild');
    }

    // Copier les fichiers statiques
    const staticFiles = [
      { src: 'manifest.json', dest: 'dist/manifest.json' },
      { src: 'src/styles/main.css', dest: 'dist/styles/main.css' }
    ];

    for (const file of staticFiles) {
      if (fs.existsSync(file.src)) {
        console.log(`📋 Copie de ${file.src}...`);
        fs.mkdirSync(path.dirname(file.dest), { recursive: true });
        fs.copyFileSync(file.src, file.dest);
      }
    }

    // Nettoyer les fichiers JS temporaires
    jsEntryPoints.forEach(jsFile => {
      if (fs.existsSync(jsFile)) fs.unlinkSync(jsFile);
    });

    console.log('✅ Build terminé avec succès!');
    console.log('📁 Fichiers générés dans le dossier dist/');
  } catch (error) {
    console.error('❌ Erreur de build:', error);
    process.exit(1);
  }
}

// Mode watch pour le développement
async function watch() {
  console.log('👀 Mode watch activé...');

  const chokidar = require('chokidar');
  const watcher = chokidar.watch('src/**/*', { ignored: /node_modules/ });

  watcher.on('change', () => {
    console.log('📁 Fichier modifié, rebuild...');
    build();
  });

  // Build initial
  await build();
}

// Exécution
if (process.argv.includes('--watch')) {
  watch();
} else {
  build();
}
