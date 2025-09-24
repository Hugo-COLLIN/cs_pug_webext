const fs = require('fs');
const path = require('path');
const pug = require('pug');

// Plugin pour les template literals Pug dans le code
const pugInlinePlugin = {
  name: 'pug-inline',
  setup(build) {
    const pugTemplateRegex = /pug`([^`]*)`/g;

    build.onLoad({ filter: /\.(coffee|js|ts)$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, 'utf8');

      // Vérifier si le fichier contient des templates Pug
      if (pugTemplateRegex.test(contents)) {
        console.log(`🐶 Templates Pug inline détectés dans ${path.relative(process.cwd(), args.path)}`);
        pugTemplateRegex.lastIndex = 0;

        // Transformer tous les templates pug en HTML
        contents = contents.replace(pugTemplateRegex, (match, pugCode) => {
          try {
            // Préprocessing pour corriger les syntaxes non-standard
            pugCode = pugCode.replace(/\?(\w+)=(\w+)/g, (match, attr, value) => {
              console.warn(`⚠️  Syntaxe non-standard détectée: ${match}. Conversion en syntaxe Pug standard.`);
              return `\${${value} ? '${attr}' : ''}`;
            });

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

            const interpolationPlaceholders = [];
            let index = 0;

            pugCode = pugCode.replace(/\${([^}]*)}/g, (_, expr) => {
              const placeholder = `___PLACEHOLDER_${index}___`;
              interpolationPlaceholders.push(expr);
              index++;
              return placeholder;
            });

            let html = pug.compile(pugCode, {
              pretty: process.env.APP_MODE === 'dev',
              filename: args.path,
              basedir: path.dirname(args.path)
            })();

            interpolationPlaceholders.forEach((expr, i) => {
              html = html.replace(
                `___PLACEHOLDER_${i}___`,
                '${' + expr + '}'
              );
            });

            html = html
              .split('\n')
              .map(line => line.trimRight())
              .join('\n')
              .trim();

            return 'html`' + html.replace(/`/g, '\\`') + '`';
          } catch (error) {
            console.error(`❌ Erreur compilation template Pug dans ${args.path}:`, error.message);
            console.error('Template Pug problématique:', pugCode);
            throw error;
          }
        });

        return {
          contents,
          loader: path.extname(args.path) === '.coffee' ? 'js' : path.extname(args.path).slice(1)
        };
      }
    });
  }
};

module.exports = { pugInlinePlugin };
