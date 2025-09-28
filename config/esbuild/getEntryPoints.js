const fs = require('fs');

// Extraction générique des entry points depuis le manifest
function getEntryPointsFromManifest() {
  const manifestPath = `src/manifest.json`;

  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️  Manifest non trouvé: ${manifestPath}`);
    return { entryPoints: {}, pugFiles: [] };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entryPoints = {};
  const pugFiles = [];
  const virtualEntries = {};

  // Fonction utilitaire pour ajouter un fichier s'il existe et est un fichier source
  function addSourceFile(filePath, context = '') {
    if (!filePath || typeof filePath !== 'string') return;

    // Nettoyer le chemin (enlever "src/" si présent au début)
    const cleanPath = filePath.startsWith('src/') ? filePath.substring(4) : filePath;
    const fullPath = `src/${cleanPath}`;

    // Vérifier si c'est un fichier source (.purs ou .pug)
    if (cleanPath.endsWith('.purs')) {
      // Déterminer le type de module basé sur le répertoire
      const moduleName = cleanPath.split('/')[0].toLowerCase(); // Background, Content, Popup
      const outputName = `js/${moduleName}`;
      const virtualKey = `virtual:${moduleName}`;

      if (fs.existsSync(fullPath)) {
        entryPoints[outputName] = virtualKey;
        virtualEntries[virtualKey] = {
          module: cleanPath.replace('.purs', '').replace('/', '.'),
          resolveDir: process.cwd()
        };
        console.log(`✅ Entry point PURS trouvé: ${cleanPath} -> ${virtualKey}`);
      } else {
        console.warn(`⚠️  Entry point PURS manquant: ${fullPath}`);
      }
    } else if (cleanPath.endsWith('.pug')) {
      if (fs.existsSync(fullPath)) {
        pugFiles.push(fullPath);
        console.log(`✅ Fichier PUG trouvé: ${fullPath}`);

        // Chercher le fichier .purs correspondant
        const correspondingPursPath = cleanPath.replace('.pug', '.purs');
        const correspondingFullPath = `src/${correspondingPursPath}`;

        if (fs.existsSync(correspondingFullPath)) {
          // Déterminer le type de module basé sur le répertoire
          const moduleName = correspondingPursPath.split('/')[0].toLowerCase();
          const outputName = `js/${moduleName}`;
          const virtualKey = `virtual:${moduleName}`;

          // Éviter les doublons si le .purs a déjà été ajouté
          if (!entryPoints[outputName]) {
            entryPoints[outputName] = virtualKey;
            virtualEntries[virtualKey] = {
              module: correspondingPursPath.replace('.purs', '').replace('/', '.'),
              resolveDir: process.cwd()
            };
            console.log(`✅ Entry point PURS correspondant trouvé: ${correspondingPursPath} -> ${virtualKey}`);
          }
        } else {
          console.log(`ℹ️  Aucun fichier .purs correspondant trouvé pour: ${cleanPath}`);
        }
      } else {
        console.warn(`⚠️  Fichier PUG manquant: ${fullPath}`);
      }
    }
  }

  // Fonction récursive pour parcourir toutes les propriétés du manifest
  function scanManifestProperties(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        // Traiter les chemins de fichiers directs
        addSourceFile(value, currentPath);
      } else if (Array.isArray(value)) {
        // Traiter les tableaux de fichiers
        value.forEach(item => {
          if (typeof item === 'string') {
            addSourceFile(item, currentPath);
          } else if (typeof item === 'object' && item !== null) {
            scanManifestProperties(item, currentPath);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Récursion pour les objets imbriqués
        scanManifestProperties(value, currentPath);
      }
    }
  }

  // Scanner tout le manifest
  scanManifestProperties(manifest);

  console.log('📄 Entry points détectés:', entryPoints);
  console.log('📄 Fichiers PUG détectés:', pugFiles);

  return { entryPoints, pugFiles, virtualEntries };
}

module.exports = { getEntryPointsFromManifest };
