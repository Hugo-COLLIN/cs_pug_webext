const fs = require('fs');
const path = require('path');

const coffeeScriptPlugin = {
  name: 'coffeescript',
  setup(build) {
    build.onLoad({ filter: /\.coffee$/ }, async (args) => {
      try {
        const coffee = require('coffeescript');
        const source = await fs.promises.readFile(args.path, 'utf8');

        console.log(`☕ Compilation ${path.relative(process.cwd(), args.path)}`);

        const result = coffee.compile(source, {
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
        throw error;
      }
    });
  }
};

module.exports = { coffeeScriptPlugin };
