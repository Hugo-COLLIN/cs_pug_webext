const fs = require('fs');
const path = require('path');
const pug = require('pug');

const pugInlinePlugin = {
  name: 'pug-inline',
  setup(build) {
    const pugTemplateRegex = /pug`([^`]*)`/g;

    build.onLoad({ filter: /\.(coffee|js|ts)$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      const fileExt = path.extname(args.path);

      if (!pugTemplateRegex.test(contents)) {
        return null;
      }

      console.log(`🐶 Templates Pug inline détectés dans ${path.relative(process.cwd(), args.path)}`);
      pugTemplateRegex.lastIndex = 0;

      const fileName = path.basename(args.path, fileExt);
      const outputDir = path.dirname(args.path.replace('src', 'dist'));

      let htmlContent = '';

      // Extraire et compiler les templates Pug
      contents = contents.replace(pugTemplateRegex, (match, pugCode) => {
        try {
          // Préprocessing pour corriger les syntaxes non-standard
          pugCode = pugCode.replace(/\?(\w+)=(\w+)/g, (match, attr, value) => {
            console.warn(`⚠️  Syntaxe non-standard détectée: ${match}. Conversion en syntaxe Pug standard.`);
            return `\${${value} ? '${attr}' : ''}`;
          });

          // Gérer l'indentation
          const lines = pugCode.split('\n');
          if (lines.length > 1) {
            const indentMatch = lines[1].match(/^\s+/);
            if (indentMatch) {
              const baseIndent = indentMatch[0];
              pugCode = lines
                .map((line, index) => {
                  if (index === 0 && line.trim() === '') return '';
                  if (line.startsWith(baseIndent)) {
                    return line.slice(baseIndent.length);
                  }
                  return line;
                })
                .join('\n');
            }
          }

          // Compiler Pug vers HTML
          let html = pug.compile(pugCode, {
            pretty: process.env.APP_MODE === 'dev',
            filename: args.path,
            basedir: path.dirname(args.path)
          })();

          htmlContent = html;

          // IMPORTANT: Retourner null au lieu d'une chaîne vide
          // et supprimer les lignes qui utilisent le template
          return 'null';
        } catch (error) {
          console.error('❌ Erreur compilation template Pug:', error);
          throw error;
        }
      });

      // Créer le fichier HTML
      const htmlTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName.charAt(0).toUpperCase() + fileName.slice(1)}</title>
  <link rel="stylesheet" href="${fileName}.css">
</head>
<body>
  ${htmlContent}
  <script src="${fileName}.js"></script>
</body>
</html>`;

      // Écrire le fichier HTML
      await fs.promises.mkdir(outputDir, { recursive: true });
      const htmlPath = path.join(outputDir, `${fileName}.html`);
      await fs.promises.writeFile(htmlPath, htmlTemplate, 'utf8');
      console.log(`📄 HTML généré: ${path.relative(process.cwd(), htmlPath)}`);

      // Compiler CoffeeScript
      if (fileExt === '.coffee') {
        try {
          const coffee = require('coffeescript');
          console.log(`☕ Compilation ${path.relative(process.cwd(), args.path)} -> HTML + JS`);

          const result = coffee.compile(contents, {
            filename: args.path,
            sourceMap: false,
            bare: true
          });

          return {
            contents: result,
            loader: 'js'
          };
        } catch (error) {
          console.error(`❌ Erreur CoffeeScript dans ${args.path}:`, error.message);
          console.error('📄 Contenu problématique:');
          console.error(contents);
          throw error;
        }
      }

      return {
        contents,
        loader: fileExt === '.ts' ? 'ts' : 'js'
      };
    });
  }
};

module.exports = { pugInlinePlugin };
