const fs = require('fs');
const path = require('path');
const pug = require('pug');

function pugPlugin(pugEntryPoints = [], watchMode = false) {
  const compiledFiles = new Set();

  async function compilePugFile(pugFile) {
    try {
      console.log(`🐶 Compilation ${path.relative(process.cwd(), pugFile)}`);

      const source = await fs.promises.readFile(pugFile, 'utf8');
      const html = pug.render(source, {
        filename: pugFile,
        pretty: process.env.APP_MODE === 'dev',
        basedir: path.dirname(pugFile)
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
      const outputPath = path.join(outputDir, fileName)

      // Créer le dossier pages/ s'il n'existe pas
      try {
        await fs.promises.mkdir(outputDir, { recursive: true });
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Vérifier si c'est un fichier au lieu d'un dossier
          const stats = await fs.promises.stat('html');
          if (!stats.isDirectory()) {
            console.error('❌ Un fichier nommé "html" existe déjà. Supprimez-le ou renommez-le.');
            throw new Error('Un fichier nommé "html" bloque la création du dossier');
          }
          // Si c'est déjà un dossier, continuer normalement
        } else {
          throw error;
        }
      }

      // Écrire le fichier HTML
      await fs.promises.writeFile(outputPath, transformedHtml);
      console.log(`✅ HTML généré: ${outputPath}`);
      compiledFiles.add(outputPath);
    } catch (error) {
      console.error(`❌ Erreur Pug dans ${pugFile}:`, error.message);
      throw error;
    }
  }

  return {
    name: 'pug',
    setup(build) {
      // Compilation initiale
      build.onStart(async () => {
        // Traiter uniquement les entry points Pug spécifiés
        for (const pugFile of pugEntryPoints) {
          if (fs.existsSync(pugFile)) {
            await compilePugFile(pugFile);
          }
        }
      });

      // Configuration du mode watch si activé
      if (watchMode) {
        build.onStart(async () => {
          // Surveiller les fichiers Pug pour les changements
          for (const pugFile of pugEntryPoints) {
            if (fs.existsSync(pugFile)) {
              // Surveiller le fichier principal
              fs.watchFile(pugFile, { interval: 1000 }, async (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                  console.log(`🔄 Changement détecté dans ${path.relative(process.cwd(), pugFile)}`);
                  try {
                    await compilePugFile(pugFile);
                  } catch (error) {
                    console.error(`❌ Erreur lors de la recompilation de ${pugFile}:`, error.message);
                  }
                }
              });

              // Surveiller aussi le dossier contenant le fichier pug pour détecter les includes/extends
              const pugDir = path.dirname(pugFile);
              if (fs.existsSync(pugDir)) {
                fs.watch(pugDir, { recursive: true }, async (eventType, filename) => {
                  if (filename && filename.endsWith('.pug')) {
                    const changedFile = path.join(pugDir, filename);
                    console.log(`🔄 Changement détecté dans ${path.relative(process.cwd(), changedFile)}`);

                    // Recompiler le fichier principal (car il pourrait inclure le fichier modifié)
                    try {
                      await compilePugFile(pugFile);
                    } catch (error) {
                      console.error(`❌ Erreur lors de la recompilation de ${pugFile}:`, error.message);
                    }
                  }
                });
              }
            }
          }

          if (pugEntryPoints.length > 0) {
            console.log(`👀 Mode watch activé pour ${pugEntryPoints.length} fichier(s) Pug`);
          }
        });

        // Nettoyer les watchers à la fermeture
        process.on('SIGINT', () => {
          console.log('\n🛑 Arrêt du watch mode Pug...');
          // Arrêter tous les watchers
          for (const pugFile of pugEntryPoints) {
            if (fs.existsSync(pugFile)) {
              fs.unwatchFile(pugFile);
            }
          }
          process.exit(0);
        });
      }
    }
  };
}

module.exports = { pugPlugin };
