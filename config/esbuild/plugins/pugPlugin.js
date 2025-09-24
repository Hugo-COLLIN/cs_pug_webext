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
                basedir: path.dirname(pugFile)
              });

              // Préserver la structure des dossiers : src/popup/popup.pug -> dist/popup/popup.html
              const srcRelativePath = path.relative('src', pugFile);
              const outputPath = path.join(build.initialOptions.outdir, srcRelativePath.replace('.pug', '.html'));

              // Créer le dossier de sortie
              await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

              // Écrire le fichier HTML
              await fs.promises.writeFile(outputPath, html);
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
