const esbuild = require('esbuild');

// Plugin pour créer des entrées virtuelles
const virtualEntryPlugin = {
  name: 'virtual-entry',
  setup(build) {
    const entries = {
      'virtual:popup': {
        module: 'Popup.Popup',
        resolveDir: process.cwd()
      },
      'virtual:background': {
        module: 'Background.Background',
        resolveDir: process.cwd()
      },
      'virtual:content': {
        module: 'Content.Content',
        resolveDir: process.cwd()
      }
    };

    // Intercepter la résolution des entrées virtuelles
    build.onResolve({ filter: /^virtual:/ }, args => {
      return {
        path: args.path,
        namespace: 'virtual-entry'
      };
    });

    // Générer le contenu des entrées virtuelles
    build.onLoad({ filter: /.*/, namespace: 'virtual-entry' }, args => {
      const entry = entries[args.path];

      if (!entry) {
        return {
          errors: [{ text: `Unknown virtual entry: ${args.path}` }]
        };
      }

      const contents = `
// Auto-generated virtual entry for ${entry.module}
import { main } from './output/${entry.module}/index.js';

// Auto-start the main function
if (typeof main === 'function') {
  try {
    main();
  } catch (error) {
    console.error('Error initializing ${entry.module}:', error);
  }
} else {
  console.error('main function not found in ${entry.module}');
}`;

      return {
        contents,
        resolveDir: entry.resolveDir
      };
    });
  }
};

const buildOptions = {
  entryPoints: {
    'js/popup': 'virtual:popup',
    'js/background': 'virtual:background',
    'js/content': 'virtual:content'
  },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
  plugins: [virtualEntryPlugin]
};

async function build() {
  try {
    await esbuild.build(buildOptions);
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  try {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('👀 Watching for changes...');
  } catch (error) {
    console.error('❌ Watch failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const isWatch = process.argv.includes('--watch');
  if (isWatch) {
    watch();
  } else {
    build();
  }
}
