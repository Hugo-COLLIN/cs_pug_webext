const fs = require('fs');
const path = require('path');

/**
 * Plugin intelligent qui :
 * 1. Parse les fichiers Pug pour détecter les imports npm
 * 2. Copie les fichiers nécessaires dans dist/js
 * 3. Réécrit les chemins dans le HTML compilé
 */
function smartCopyNpmDependenciesPlugin(options = {}) {
  const {
    outputDir = 'dist/js',
    nodeModulesPath = './node_modules',
    pugFiles = []
  } = options;

  // Cache pour éviter de recopier plusieurs fois
  const copiedFiles = new Map();
  const importMap = new Map(); // Map des imports détectés

  return {
    name: 'smart-copy-npm-dependencies',
    setup(build) {
      // Phase 1: Scanner les fichiers Pug AVANT la compilation
      build.onStart(() => {
        copiedFiles.clear();
        importMap.clear();

        if (!pugFiles || pugFiles.length === 0) {
          return;
        }

        console.log('🔍 Scan des imports npm dans les fichiers Pug...');

        for (const pugFile of pugFiles) {
          if (fs.existsSync(pugFile)) {
            const imports = extractNpmImportsFromPug(pugFile);
            if (imports.length > 0) {
              importMap.set(pugFile, imports);
              console.log(`  📄 ${path.relative('.', pugFile)}: ${imports.length} import(s)`);
              imports.forEach(imp => console.log(`     - ${imp.original}`));
            }
          }
        }

        if (importMap.size > 0) {
          console.log(`📦 ${Array.from(importMap.values()).flat().length} import(s) npm détecté(s) au total`);
        }
      });

      // Phase 2: Copier les fichiers npm détectés
      build.onEnd(async (result) => {
        if (importMap.size === 0) {
          return;
        }

        try {
          const fullOutputDir = path.resolve(outputDir);
          if (!fs.existsSync(fullOutputDir)) {
            fs.mkdirSync(fullOutputDir, { recursive: true });
          }

          console.log('📦 Copie des dépendances npm détectées...');

          // Collecter tous les imports uniques
          const allImports = new Set();
          for (const imports of importMap.values()) {
            for (const imp of imports) {
              allImports.add(JSON.stringify(imp)); // Utiliser JSON pour dédupliquer
            }
          }

          // Copier chaque import unique
          for (const impJson of allImports) {
            const importInfo = JSON.parse(impJson);
            await copyNpmFile(
              importInfo,
              nodeModulesPath,
              fullOutputDir,
              copiedFiles
            );
          }

          // Phase 3: Réécrire les chemins dans les fichiers HTML compilés
          console.log('✏️  Réécriture des chemins dans les fichiers HTML...');

          // Reconstruire la liste simple des imports pour la réécriture
          const importsForRewrite = Array.from(allImports).map(json => JSON.parse(json));
          rewriteHtmlPaths(path.resolve('dist'), importsForRewrite);

          console.log('✅ Copie et réécriture terminées');
        } catch (error) {
          console.error('❌ Erreur:', error);
        }
      });
    }
  };
}

/**
 * Extraire les imports npm d'un fichier Pug
 */
function extractNpmImportsFromPug(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];

  // Patterns pour détecter les imports npm
  const patterns = [
    // script(src="@package/name/path")
    /(?:src|href)\s*=\s*["'](@[^"'\s)]+\/[^"'\s)]+)["']/g,
    // script(defer, src="@package")
    /(?:src|href)\s*=\s*["'](@[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*)["']/g,
    // Pour les packages non-scoped
    /(?:src|href)\s*=\s*["']([a-z][a-z0-9-]+(?:\/[^"'\s)]+)?)["']/g,
  ];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern);
    const text = content;

    while ((match = regex.exec(text)) !== null) {
      const importPath = match[1];

      // Ignorer les chemins relatifs et absolus
      if (importPath.startsWith('./') ||
        importPath.startsWith('../') ||
        importPath.startsWith('/') ||
        importPath.startsWith('http://') ||
        importPath.startsWith('https://')) {
        continue;
      }

      // Parser le chemin npm
      const parsed = parseNpmPath(importPath);
      if (parsed) {
        imports.push({
          original: importPath,
          ...parsed
        });
      }
    }
  }

  // Dédupliquer par original
  const unique = [];
  const seen = new Set();
  for (const imp of imports) {
    if (!seen.has(imp.original)) {
      seen.add(imp.original);
      unique.push(imp);
    }
  }

  return unique;
}

/**
 * Parser un chemin npm en package + subpath
 */
function parseNpmPath(importPath) {
  let packageName, subpath;

  if (importPath.startsWith('@')) {
    // Scoped package: @scope/name/path
    const parts = importPath.split('/');
    if (parts.length < 2) return null;

    packageName = `${parts[0]}/${parts[1]}`;
    subpath = parts.slice(2).join('/') || null;
  } else {
    // Regular package: name/path
    const parts = importPath.split('/');
    packageName = parts[0];
    subpath = parts.slice(1).join('/') || null;
  }

  return { packageName, subpath };
}

/**
 * Copier un fichier npm dans dist/js
 */
async function copyNpmFile(importInfo, nodeModulesPath, outputDir, copiedFiles) {
  const { packageName, subpath, original } = importInfo;

  // Chemin source
  let sourcePath;
  if (subpath) {
    sourcePath = path.join(nodeModulesPath, packageName, subpath);
  } else {
    // Si pas de subpath, chercher le fichier principal
    sourcePath = findMainFile(path.join(nodeModulesPath, packageName));
  }

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.warn(`  ⚠️  Fichier non trouvé: ${original}`);
    console.warn(`      Cherché à: ${sourcePath || 'N/A'}`);
    return;
  }

  // Chemin de destination
  // Structure: dist/js/@scope/package/path/file.js OU dist/js/package-name.js
  let destPath;
  if (subpath) {
    // Garder l'arborescence complète
    destPath = path.join(outputDir, original);
  } else {
    // Pour les packages sans subpath, utiliser un nom simplifié
    const cleanName = getCleanPackageName(packageName);
    destPath = path.join(outputDir, `${cleanName}.js`);
  }

  // Éviter de copier plusieurs fois le même fichier
  if (copiedFiles.has(destPath)) {
    return;
  }

  // Créer les répertoires nécessaires
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copier le fichier
  fs.copyFileSync(sourcePath, destPath);
  copiedFiles.set(destPath, true);

  console.log(`  ✅ ${original} -> ${path.relative('dist', destPath)}`);

  // Si c'est un fichier JS, copier aussi les dépendances (imports relatifs)
  if (destPath.endsWith('.js') && subpath) {
    await copyRelativeDependencies(
      sourcePath,
      path.dirname(sourcePath),
      destDir,
      copiedFiles
    );
  }
}

/**
 * Convertir un nom de package en nom de fichier propre
 */
function getCleanPackageName(packageName) {
  // Convertir @alpinejs/csp en alpinejs-csp
  if (packageName.startsWith('@')) {
    return packageName.substring(1).replace('/', '-');
  }
  return packageName;
}

/**
 * Trouver le fichier principal d'un package npm
 */
function findMainFile(packagePath) {
  // 1. Lire package.json
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Chercher dans cet ordre: browser, module, main
      const candidates = [
        packageJson.browser,
        packageJson.module,
        packageJson.main
      ].filter(Boolean);

      for (const candidate of candidates) {
        const filePath = path.join(packagePath, candidate);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
    } catch (error) {
      // Ignorer les erreurs de parsing
    }
  }

  // 2. Fallback: chercher index.js
  const indexPath = path.join(packagePath, 'index.js');
  if (fs.existsSync(indexPath)) {
    return indexPath;
  }

  return null;
}

/**
 * Copier les dépendances relatives d'un fichier JS
 */
async function copyRelativeDependencies(sourceFile, sourceDir, destDir, copiedFiles, depth = 0) {
  if (depth > 3) return; // Limiter la profondeur pour éviter les boucles

  try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const relativePath = match[1];

      // Résoudre le chemin
      let resolvedPath = path.join(sourceDir, relativePath);

      // Ajouter .js si pas d'extension
      if (!path.extname(resolvedPath)) {
        resolvedPath += '.js';
      }

      if (fs.existsSync(resolvedPath)) {
        const relativeFromSource = path.relative(sourceDir, resolvedPath);
        const destPath = path.join(destDir, relativeFromSource);

        if (!copiedFiles.has(destPath)) {
          const destSubDir = path.dirname(destPath);
          if (!fs.existsSync(destSubDir)) {
            fs.mkdirSync(destSubDir, { recursive: true });
          }

          fs.copyFileSync(resolvedPath, destPath);
          copiedFiles.set(destPath, true);

          // Récursif pour les dépendances de dépendances
          await copyRelativeDependencies(
            resolvedPath,
            path.dirname(resolvedPath),
            destSubDir,
            copiedFiles,
            depth + 1
          );
        }
      }
    }
  } catch (error) {
    // Ignorer les erreurs de parsing
  }
}

/**
 * Réécrire les chemins dans les fichiers HTML compilés
 */
function rewriteHtmlPaths(distDir, imports) {
  // Scanner tous les fichiers HTML dans dist/
  scanAndRewriteHtml(distDir, imports);
}

function scanAndRewriteHtml(dir, imports) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanAndRewriteHtml(filePath, imports);
    } else if (file.endsWith('.html')) {
      rewriteHtmlFile(filePath, imports);
    }
  }
}

function rewriteHtmlFile(filePath, imports) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const importInfo of imports) {
    const { original, packageName, subpath } = importInfo;

    // Déterminer le nouveau chemin
    let newPath;
    if (subpath) {
      // Garder l'arborescence: ../js/@scope/package/path/file.js
      newPath = `../js/${original}`;
    } else {
      // Simplifier: ../js/alpinejs-csp.js
      const cleanName = getCleanPackageName(packageName);
      newPath = `../js/${cleanName}.js`;
    }

    // Échapper les caractères spéciaux pour regex
    const escapedOriginal = escapeRegex(original);

    // Patterns à remplacer
    const patterns = [
      new RegExp(`(src|href)=["']${escapedOriginal}["']`, 'g'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `$1="${newPath}"`);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✏️  ${path.relative('.', filePath)}`);
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { smartCopyNpmDependenciesPlugin };
