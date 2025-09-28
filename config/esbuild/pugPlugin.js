const fs = require('fs');
const path = require('path');
const pug = require('pug');

function pugPlugin(pugEntryPoints = []) {
  return {
    name: 'pug',
    setup(build) {
      build.onStart(async () => {
        // Traiter uniquement les entry points Pug spécifiés
        for (const pugFile of pugEntryPoints) {
          if (fs.existsSync(pugFile)) {
            try {
              console.log(`🐶 Compilation ${path.relative(process.cwd(), pugFile)}`);

              const source = await fs.promises.readFile(pugFile, 'utf8');
              const html = pug.render(source, {
                filename: pugFile,
                pretty: process.env.APP_MODE === 'dev',
                basedir: path.dirname(pugFile),
                // Ajouter une fonction pour transformer les chemins des scripts
                filters: {
                  transformScriptPaths: function(text) {
                    // Remplacer les extensions .purs par .js et ajouter le préfixe ../dist/js/
                    return text.replace(/src="([^"]+)\.purs"/g, 'src="../dist/js/$1.js"');
                  }
                }
              });

              // Transformer les chemins des scripts dans le HTML généré
              const transformedHtml = html.replace(
                /src="([^"]+)\.purs"/g,
                (match, p1) => `src="../js/${p1.toLowerCase()}.js"`
              );


              // Nom du fichier sans extension et sans chemin
              const fileName = path.basename(pugFile, '.pug') + '.html';

              // Chemin de sortie dans le dossier pages/
              const outputDir = path.join('dist', 'pages');
              const outputPath = path.join(outputDir, fileName);

              // Créer le dossier pages/ s'il n'existe pas
              await fs.promises.mkdir(outputDir, { recursive: true });

              // Écrire le fichier HTML
              await fs.promises.writeFile(outputPath, transformedHtml);
              console.log(`✅ HTML généré: ${outputPath}`);
            } catch (error) {
              console.error(`❌ Erreur Pug dans ${pugFile}:`, error.message);
              throw error;
            }
          }
        }
      });
    }
  };
}

module.exports = { pugPlugin };
