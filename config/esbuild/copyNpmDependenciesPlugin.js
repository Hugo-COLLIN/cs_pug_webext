// config/esbuild/copyNpmDependenciesPlugin.js
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
              console.warn(`  ⚠️  ${depName} non trouvé`);
              continue;
            }

            const jsFile = findUsableJSFile(depPath);

            if (jsFile) {
              const destFile = path.join(fullOutputDir, `${depName}.js`);
              fs.copyFileSync(jsFile, destFile);
              console.log(`  ✅ ${depName}.js`);
            } else {
              console.warn(`  ⚠️  Aucun fichier JS utilisable pour ${depName}`);
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

function findUsableJSFile(depPath) {
  // Liste des fichiers à chercher par ordre de priorité
  const candidates = [
    // Versions browser/UMD (priorité max)
    'dist/umd/index.js',
    'dist/browser.js',
    'dist/bundle.js',
    'umd/index.js',
    'browser.js',

    // Versions CDN
    'dist/cdn.js',
    'cdn.js',

    // Versions minifiées
    'dist/index.min.js',
    'index.min.js',

    // Versions standard
    'dist/index.js',
    'dist/main.js',
    'lib/index.js',
    'build/index.js',
    'index.js',
    'main.js'
  ];

  for (const candidate of candidates) {
    const filePath = path.join(depPath, candidate);
    if (fs.existsSync(filePath)) {
      // Vérifier que c'est un fichier JS utilisable (pas un module pur)
      const content = fs.readFileSync(filePath, 'utf8');

      // Éviter les fichiers qui sont clairement des modules ES6
      if (!content.includes('export default') && !content.includes('export {')) {
        return filePath;
      }
    }
  }

  // Si aucun fichier compatible trouvé, prendre le premier disponible
  for (const candidate of candidates) {
    const filePath = path.join(depPath, candidate);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

module.exports = { copyNpmDependenciesPlugin };
