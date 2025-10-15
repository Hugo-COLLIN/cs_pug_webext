const fs = require('fs');
const path = require('path');
const pug = require('pug');

function pugPlugin(pugEntryPoints = [], watchMode = false) {
  const compiledFiles = new Set();

  function extractScriptContent(html, fileName) {
    const scriptRegex = /<script(?:\s[^>]*)?>([^]*?)<\/script>/gi;
    const scripts = [];
    let match;
    let scriptIndex = 0;

    // Extraire tous les scripts inline
    while ((match = scriptRegex.exec(html)) !== null) {
      const fullMatch = match[0];
      const scriptContent = match[1].trim();

      // Ignorer les scripts avec src (scripts externes)
      if (fullMatch.includes('src=')) {
        continue;
      }

      if (scriptContent) {
        scripts.push({
          content: scriptContent,
          index: scriptIndex++,
          fullMatch: fullMatch
        });
      }
    }

    return scripts;
  }

  function generateScriptFileName(baseName, index) {
    if (index === 0) {
      return `${baseName}.js`;
    }
    return `${baseName}-${index}.js`;
  }

  async function writeScriptFiles(scripts, baseName) {
    const jsDir = path.join('dist', 'js');
    const scriptFiles = [];

    // Créer le dossier js s'il n'existe pas
    await fs.promises.mkdir(jsDir, { recursive: true });

    for (const script of scripts) {
      const scriptFileName = generateScriptFileName(baseName, script.index);
      const scriptPath = path.join(jsDir, scriptFileName);

      await fs.promises.writeFile(scriptPath, script.content);
      console.log(`✅ Script JS généré: ${scriptPath}`);

      scriptFiles.push({
        fileName: scriptFileName,
        fullMatch: script.fullMatch
      });
    }

    return scriptFiles;
  }

  function replaceScriptsWithExternalRefs(html, scriptFiles) {
    let modifiedHtml = html;

    for (const scriptFile of scriptFiles) {
      // Remplacer le script inline par une référence externe
      const externalScriptTag = `<script src="../js/${scriptFile.fileName}"></script>`;
      modifiedHtml = modifiedHtml.replace(scriptFile.fullMatch, externalScriptTag);
    }

    return modifiedHtml;
  }

  async function compilePugFile(pugFile) {
    try {
      console.log(`🐶 Compilation ${path.relative(process.cwd(), pugFile)}`);

      const source = await fs.promises.readFile(pugFile, 'utf8');
      const html = pug.render(source, {
        filename: pugFile,
        pretty: process.env.APP_MODE === 'dev',
        basedir: path.dirname(pugFile)
      });

      // Transform script paths in the generated HTML (pour les .purs)
      let transformedHtml = html.replace(
        /src="([^"]+)\.purs"/g,
        (match, p1) => `src="../js/${p1.toLowerCase()}.js"`
      );

      // Extraire les scripts inline
      const baseName = path.basename(pugFile, '.pug');
      const scripts = extractScriptContent(transformedHtml, baseName);

      if (scripts.length > 0) {
        console.log(`📜 ${scripts.length} script(s) inline trouvé(s) dans ${baseName}.pug`);

        // Écrire les fichiers JS externes
        const scriptFiles = await writeScriptFiles(scripts, baseName);

        // Remplacer les scripts inline par des références externes
        transformedHtml = replaceScriptsWithExternalRefs(transformedHtml, scriptFiles);
      }

      // File name without extension and path
      const fileName = baseName + '.html';

      // Output path is the html/ directory
      const outputDir = path.join('dist', 'html');
      const outputPath = path.join(outputDir, fileName);

      // Create the html/ folder if it does not exist
      try {
        await fs.promises.mkdir(outputDir, { recursive: true });
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Check if it's a file instead of a folder
          const stats = await fs.promises.stat(outputDir);
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
                    console.error(`❌ Error while recompiling ${pugFile}:`, error.message);
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
                      console.error(`❌ Error while recompiling ${pugFile}:`, error.message);
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
