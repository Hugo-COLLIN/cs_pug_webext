const fs = require('fs');
const path = require('path');

function copyNpmDependenciesPlugin(options = {}) {
  const {
    outputDir = options.outputDir || 'dist/js',
    packageJsonPath = './package.json',
    nodeModulesPath = './node_modules'
  } = options;

  return {
    name: 'copy-npm-dependencies',
    setup(build) {
      build.onEnd(async (result) => {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const dependencies = packageJson.dependencies || {};

          if (Object.keys(dependencies).length === 0) {
            console.log('📦 Aucune dépendance à copier');
            return;
          }

          const fullOutputDir = path.resolve(outputDir);
          if (!fs.existsSync(fullOutputDir)) {
            fs.mkdirSync(fullOutputDir, { recursive: true });
          }

          console.log('📦 Copie des dépendances npm...');

          for (const [depName, version] of Object.entries(dependencies)) {
            const depPath = path.join(nodeModulesPath, depName);

            if (!fs.existsSync(depPath)) {
              console.warn(`  ⚠️  ${depName} non trouvé dans ${depPath}`);
              continue;
            }

            const jsFile = findUsableJSFile(depPath, depName);

            if (jsFile) {
              // Générer un nom de fichier propre pour les packages avec scope
              const cleanDepName = getCleanPackageName(depName);
              const destFile = path.join(fullOutputDir, `${cleanDepName}.js`);

              fs.copyFileSync(jsFile, destFile);
              console.log(`  ✅ ${cleanDepName}.js (${path.relative(depPath, jsFile)})`);
            } else {
              console.warn(`  ⚠️  Aucun fichier JS utilisable pour ${depName}`);

              // Debug: lister les fichiers disponibles
              console.log(`  📁 Contenu de ${depPath}:`);
              try {
                const files = fs.readdirSync(depPath);
                files.forEach(file => {
                  const filePath = path.join(depPath, file);
                  const stats = fs.statSync(filePath);
                  console.log(`    ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
                });
              } catch (error) {
                console.log(`    ❌ Impossible de lire le contenu: ${error.message}`);
              }
            }
          }

          console.log('📦 Copie terminée');
        } catch (error) {
          console.error('❌ Erreur:', error);
        }
      });
    }
  };
}

function getCleanPackageName(depName) {
  // Convertir @alpinejs/csp en alpinejs-csp
  if (depName.startsWith('@')) {
    return depName.substring(1).replace('/', '-');
  }
  return depName;
}

function findUsableJSFile(depPath, depName) {
  // Liste générale des fichiers à chercher par ordre de priorité
  const candidates = [
    // Versions UMD spécifiques
    `dist/${path.basename(depName)}.umd.js`,
    `dist/${path.basename(depName)}.umd.min.js`,
    `umd/${path.basename(depName)}.js`,
    `umd/${path.basename(depName)}.min.js`,

    // Versions browser/UMD génériques
    'dist/umd/index.js',
    'dist/browser.js',
    'dist/bundle.js',
    'umd/index.js',
    'browser.js',

    // Versions CDN
    'dist/cdn.js',
    'cdn.js',

    // Versions globales
    'dist/global.js',
    `dist/${path.basename(depName)}.global.js`,
    `dist/${path.basename(depName)}.global.min.js`,

    // Versions minifiées
    'dist/index.min.js',
    'index.min.js',
    `dist/${path.basename(depName)}.min.js`,
    `${path.basename(depName)}.min.js`,

    // Versions standard
    'dist/index.js',
    'dist/main.js',
    'lib/index.js',
    'build/index.js',
    `dist/${path.basename(depName)}.js`,
    `${path.basename(depName)}.js`,
    'index.js',
    'main.js'
  ];

  for (const candidate of candidates) {
    const filePath = path.join(depPath, candidate);
    if (fs.existsSync(filePath)) {
      // Vérifier que c'est un fichier JS utilisable
      if (isUsableJSFile(filePath)) {
        console.log(`  🔍 Fichier trouvé pour ${depName}: ${candidate}`);
        return filePath;
      }
    }
  }

  // Si aucun fichier compatible trouvé, prendre le premier disponible
  for (const candidate of candidates) {
    const filePath = path.join(depPath, candidate);
    if (fs.existsSync(filePath)) {
      console.log(`  🔍 Fichier de fallback pour ${depName}: ${candidate}`);
      return filePath;
    }
  }

  return null;
}

function isUsableJSFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Fichiers trop petits (probablement des redirections)
    if (content.length < 100) {
      return false;
    }

    // Éviter les fichiers qui sont clairement des modules ES6 purs
    const hasESModuleExports = content.includes('export default') ||
      content.includes('export {') ||
      content.includes('export const') ||
      content.includes('export function');

    const hasCommonJSOrUMD = content.includes('module.exports') ||
      content.includes('define(') ||
      content.includes('(function (global, factory)') ||
      content.includes('typeof exports');

    // Préférer les fichiers avec CommonJS/UMD, éviter les modules ES6 purs
    if (hasESModuleExports && !hasCommonJSOrUMD) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { copyNpmDependenciesPlugin };
