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

      // Transform script paths in the generated HTML
      const transformedHtml = html.replace(
        /src="([^"]+)\.purs"/g,
        (match, p1) => `src="../js/${p1.toLowerCase()}.js"`
      );

      // File name without extension and path
      const fileName = path.basename(pugFile, '.pug') + '.html';

      // Output path is the html/ directory
      const outputDir = path.join('dist', 'html');
      const outputPath = path.join(outputDir, fileName)

      // Create the html/ folder if it does not exist
      try {
        await fs.promises.mkdir(outputDir, { recursive: true });
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Check if it’s a file instead of a folder
          const stats = await fs.promises.stat('html');
          if (!stats.isDirectory()) {
            console.error('❌ A file named "html" already exists. Delete it or rename it.');
            throw new Error('A file named "html" blocks the creation of the folder');
          }
          // If it is already a file, continue normally
        } else {
          throw error;
        }
      }

      // Write the HTML file
      await fs.promises.writeFile(outputPath, transformedHtml);
      console.log(`✅ HTML generated: ${outputPath}`);
      compiledFiles.add(outputPath);
    } catch (error) {
      console.error(`❌ Pug error in ${pugFile}:`, error.message);
      throw error;
    }
  }

  return {
    name: 'pug',
    setup(build) {
      // Initial compilation
      build.onStart(async () => {
        // Process only the specified Pug entry points
        for (const pugFile of pugEntryPoints) {
          if (fs.existsSync(pugFile)) {
            await compilePugFile(pugFile);
          }
        }
      });

      // Configuration of the watch mode if activated
      if (watchMode) {
        build.onStart(async () => {
          // Monitor Pug files for changes
          for (const pugFile of pugEntryPoints) {
            if (fs.existsSync(pugFile)) {
              // Surveiller le fichier principal
              fs.watchFile(pugFile, { interval: 1000 }, async (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                  console.log(`🔄 Change detected in ${path.relative(process.cwd(), pugFile)}`);
                  try {
                    await compilePugFile(pugFile);
                  } catch (error) {
                    console.error(`❌ Error while recomplying of ${pugFile}:`, error.message);
                  }
                }
              });

              // Also monitor the folder containing the pug file to detect includes/extends
              const pugDir = path.dirname(pugFile);
              if (fs.existsSync(pugDir)) {
                fs.watch(pugDir, { recursive: true }, async (eventType, filename) => {
                  if (filename && filename.endsWith('.pug')) {
                    const changedFile = path.join(pugDir, filename);
                    console.log(`🔄 Change detected in ${path.relative(process.cwd(), changedFile)}`);

                    // Recompile the main file (as it might include the modified file)
                    try {
                      await compilePugFile(pugFile);
                    } catch (error) {
                      console.error(`❌ Error while recomplying of ${pugFile}:`, error.message);
                    }
                  }
                });
              }
            }
          }

          if (pugEntryPoints.length > 0) {
            console.log(`👀 Watch mode activated for ${pugEntryPoints.length} Pug file(s)`);
          }
        });

        // Clean the watchers at closing time
        process.on('SIGINT', () => {
          console.log('\n🛑 Stopping watch mode Pug...');
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
