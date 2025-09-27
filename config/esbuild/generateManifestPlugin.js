const path = require('path');
const fs = require('fs');

// Utilitaires JSON
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Impossible de lire ${filePath}:`, error.message);
    return {};
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

          console.log(`📋 Génération du manifest pour ${targetBrowser}...`);

          // Manifest de base avec valeurs par défaut
          let manifest = {
            manifest_version: srcManifest[`{{${targetBrowser}}}.manifest_version`] || (targetBrowser === 'firefox' ? 2 : 3),
            name: srcManifest.name || pkg.name || 'Mon Extension',
            version: version || srcManifest.version || pkg.version || '1.0.0',
            description: srcManifest.description || pkg.description || 'Extension développée avec PureScript et Pug',
            homepage_url: srcManifest.homepage_url || pkg.homepage,
          };

          // Fonction pour traiter récursivement les propriétés avec syntaxe {{browser}}
          function processObject(obj, targetObj) {
            for (const key in obj) {
              if (!obj.hasOwnProperty(key)) continue;

              const isBrowserSpecificKey = key.startsWith(`{{${targetBrowser}}}`);
              const isOtherBrowserKey = key.startsWith('{{') && !isBrowserSpecificKey;

              // Ignorer les clés d'autres navigateurs
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
              } else {
                targetObj[manifestKey] = value;
              }
            }
          }

          // Traiter le manifest source
          processObject(srcManifest, manifest);

          // Adaptations spécifiques par navigateur
          if (targetBrowser === 'firefox') {
            // Convertir service_worker vers scripts pour Firefox Manifest V2
            if (manifest.background && manifest.background.service_worker) {
              manifest.background = {
                scripts: [manifest.background.service_worker],
                persistent: false
              };
            }

            // Convertir action vers browser_action pour Firefox
            if (manifest.action) {
              manifest.browser_action = manifest.action;
              delete manifest.action;
            }

            // Adapter options_page pour Firefox
            if (manifest.options_page) {
              manifest.options_ui = {
                page: manifest.options_page,
                open_in_tab: true
              };
              delete manifest.options_page;
            }
          }

          // Nettoyer les propriétés vides
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
          console.log(`✅  Manifest généré: ${distManifestPath}`);
        } catch (error) {
          console.error('❌  Erreur génération manifest:', error.message);
          throw error;
        }
      });
    }
  };
}

module.exports = { generateManifestPlugin };
