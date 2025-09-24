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

      // Vérifier si le fichier contient des templates Pug
      if (!pugTemplateRegex.test(contents)) {
        return null;
      }

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

          // Gérer les interpolations ${...}
          const interpolationPlaceholders = [];
          let index = 0;

          pugCode = pugCode.replace(/\${([^}]*)}/g, (_, expr) => {
            const placeholder = `___PLACEHOLDER_${index}___`;
            interpolationPlaceholders.push(expr);
            index++;
            return placeholder;
          });

          // Compiler Pug vers HTML
          let html = pug.compile(pugCode, {
            pretty: process.env.APP_MODE === 'dev',
            filename: args.path,
            basedir: path.dirname(args.path)
          })();

          // Restaurer les interpolations
          interpolationPlaceholders.forEach((expr, i) => {
            html = html.replace(
              `___PLACEHOLDER_${i}___`,
              '${' + expr + '}'
            );
          });

          // Nettoyer l'HTML et le formater sur une seule ligne pour éviter les problèmes d'indentation
          html = html
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('')
            .trim();

          return '`' + html.replace(/`/g, '\\`') + '`';
        } catch (error) {
          console.error('❌ Erreur compilation template Pug:', error);
          throw error;
        }
      });

      // Traitement selon le type de fichier
      if (fileExt === '.coffee') {
        try {
          const coffee = require('coffeescript');
          console.log(`☕ Compilation ${path.relative(process.cwd(), args.path)} (avec templates Pug)`);

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
          console.error('📄 Contenu qui a causé l\'erreur:');
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
