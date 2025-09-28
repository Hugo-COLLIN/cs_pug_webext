// Plugin to create virtual entries
function virtualEntryPlugin(entries = {}) {
  return {
    name: 'virtual-entry',
    setup(build) {
      // Intercept the resolution of virtual inputs
      build.onResolve({ filter: /^virtual:/ }, args => {
        return {
          path: args.path,
          namespace: 'virtual-entry'
        };
      });

      // Generate the content of virtual entries
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
}

module.exports = { virtualEntryPlugin };
