const fs = require('fs');
const path = require('path');
const pug = require('pug');

const pugPlugin = {
  name: 'pug',
  setup(build) {
    build.onLoad({ filter: /\.pug$/ }, async (args) => {
      try {
        const source = await fs.promises.readFile(args.path, 'utf8');

        console.log(`🐶 Compilation ${path.relative(process.cwd(), args.path)}`);

        const html = pug.render(source, {
          filename: args.path,
          pretty: process.env.APP_MODE === 'dev',
          basedir: path.dirname(args.path)
        });

        // Déterminer le chemin de sortie
        const relativePath = path.relative('src/templates', args.path);
        const outputPath = path.join(build.initialOptions.outdir, relativePath.replace('.pug', '.html'));

        // Créer le dossier de sortie
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

        // Écrire le fichier HTML
        await fs.promises.writeFile(outputPath, html);

        return {
          contents: '', // Pas besoin de contenu JS
          loader: 'js'
        };
      } catch (error) {
        console.error(`❌ Erreur Pug dans ${args.path}:`, error.message);
        throw error;
      }
    });
  }
};

module.exports = { pugPlugin };
