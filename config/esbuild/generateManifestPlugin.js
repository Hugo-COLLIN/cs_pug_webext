const path = require('path');
const fs = require('fs');

// JSON utilities
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Unable to read ${filePath}:`, error.message);
    return {};
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Function to convert source paths to output paths
function convertSourcePathToOutput(sourcePath) {
  if (!sourcePath || typeof sourcePath !== 'string') {
    return sourcePath;
  }

  // Retrieve only the file name (ex: "foo.purs")
  const fileName = path.basename(sourcePath);

  // Convert source paths to output paths
  if (sourcePath.endsWith(".purs")) {
    // js/<file_name>.js
    return `js/${fileName.toLowerCase().replace(/\.purs$/, ".js")}`;
  }

  if (sourcePath.endsWith(".pug")) {
    // html/<file_name>.html
    return `html/${fileName.toLowerCase().replace(/\.pug$/, ".html")}`;
  }

  return sourcePath;
}

function generateManifestPlugin(targetBrowser, version) {
  return {
    name: 'generate-manifest',
    setup(build) {
      build.onEnd(() => {
        try {
          const srcManifestPath = path.join(process.cwd(), 'src', 'manifest.json');
          const distManifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
          const pkgPath = path.join(process.cwd(), 'package.json');

          const srcManifest = readJsonFile(srcManifestPath);
          const pkg = readJsonFile(pkgPath);

          console.log(`📋 Generating manifest for ${targetBrowser}...`);

          // Basic manifest with default values
          let manifest = {
            manifest_version: srcManifest[`{{${targetBrowser}}}.manifest_version`] || (targetBrowser === 'firefox' ? 2 : 3),
            name: srcManifest.name || pkg.name || 'My Extension',
            version: version || srcManifest.version || pkg.version || '1.0.0',
            description: srcManifest.description || pkg.description || 'Extension developed with PureScript and Pug',
            homepage_url: srcManifest.homepage_url || pkg.homepage,
          };

          // Function to recursively process properties with {{browser}} syntax
          function processObject(obj, targetObj) {
            for (const key in obj) {
              if (!obj.hasOwnProperty(key)) continue;

              const isBrowserSpecificKey = key.startsWith(`{{${targetBrowser}}}`);
              const isOtherBrowserKey = key.startsWith('{{') && !isBrowserSpecificKey;

              // Ignore other browsers' keys
              if (isOtherBrowserKey) continue;

              let manifestKey;
              if (isBrowserSpecificKey) {
                manifestKey = key.replace(`{{${targetBrowser}}}.`, '');
              } else if (!key.startsWith('{{')) {
                manifestKey = key;
              } else {
                continue;
              }

              const value = obj[key];

              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                targetObj[manifestKey] = {};
                processObject(value, targetObj[manifestKey]);
              } else if (Array.isArray(value)) {
                // Process arrays (like content_scripts[].js)
                targetObj[manifestKey] = value.map(item => {
                  if (typeof item === 'object' && item !== null) {
                    const processedItem = {};
                    processObject(item, processedItem);
                    return processedItem;
                  } else if (typeof item === 'string') {
                    return convertSourcePathToOutput(item);
                  }
                  return item;
                });
              } else if (typeof value === 'string') {
                // Convert source paths to output paths
                targetObj[manifestKey] = convertSourcePathToOutput(value);
              } else {
                targetObj[manifestKey] = value;
              }
            }
          }

          // Process the source manifest
          processObject(srcManifest, manifest);

          // Specific browser adaptations
          if (targetBrowser === 'firefox') {
            // Convert service_worker to scripts for Firefox Manifest V2
            if (manifest.background && manifest.background.service_worker) {
              manifest.background = {
                scripts: [manifest.background.service_worker],
                persistent: false
              };
            }

            // Convert action to browser_action for Firefox
            if (manifest.action) {
              manifest.browser_action = manifest.action;
              delete manifest.action;
            }

            // Adapt options_page for Firefox
            if (manifest.options_page) {
              manifest.options_ui = {
                page: manifest.options_page,
                open_in_tab: true
              };
              delete manifest.options_page;
            }
          }

          // Clean up empty properties
          function cleanEmptyProperties(obj) {
            Object.keys(obj).forEach(key => {
              const value = obj[key];
              if (value === null || value === undefined) {
                delete obj[key];
              } else if (typeof value === 'object' && !Array.isArray(value)) {
                cleanEmptyProperties(value);
                if (Object.keys(value).length === 0) {
                  delete obj[key];
                }
              }
            });
          }

          cleanEmptyProperties(manifest);

          writeJsonFile(distManifestPath, manifest);
          console.log(`✅  Manifest generated: ${distManifestPath}`);
        } catch (error) {
          console.error('❌  Manifest generation error:', error.message);
          throw error;
        }
      });
    }
  };
}

module.exports = { generateManifestPlugin };
