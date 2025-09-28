const fs = require('fs');

// Generic extraction of entry points from the manifest
function getEntryPointsFromManifest() {
  const manifestPath = `src/manifest.json`;

  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️  Manifest not found: ${manifestPath}`);
    return { entryPoints: {}, pugFiles: [] };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entryPoints = {};
  const pugFiles = [];
  const virtualEntries = {};

  // Utility function to add a file if it exists and is a source file
  function addSourceFile(filePath, context = '') {
    if (!filePath || typeof filePath !== 'string') return;

    // Clean the path (remove "src/" if present at the beginning)
    const cleanPath = filePath.startsWith('src/') ? filePath.substring(4) : filePath;
    const fullPath = `src/${cleanPath}`;

    // Check if it is a source file (.purs or .pug)
    if (cleanPath.endsWith('.purs')) {
      // Determine the type of module based on the directory
      const moduleName = cleanPath.split('/')[0].toLowerCase(); // Background, Content, Popup
      const outputName = `js/${moduleName}`;
      const virtualKey = `virtual:${moduleName}`;

      if (fs.existsSync(fullPath)) {
        entryPoints[outputName] = virtualKey;
        virtualEntries[virtualKey] = {
          module: cleanPath.replace('.purs', '').replace('/', '.'),
          resolveDir: process.cwd()
        };
        console.log(`✅ Entry point PURS found: ${cleanPath} -> ${virtualKey}`);
      } else {
        console.warn(`⚠️  Entry point PURS missing: ${fullPath}`);
      }
    } else if (cleanPath.endsWith('.pug')) {
      if (fs.existsSync(fullPath)) {
        pugFiles.push(fullPath);
        console.log(`✅ PUG file found: ${fullPath}`);

        // Search for the matching . pure file
        const correspondingPursPath = cleanPath.replace('.pug', '.purs');
        const correspondingFullPath = `src/${correspondingPursPath}`;

        if (fs.existsSync(correspondingFullPath)) {
          // Determine the type of module based on the directory
          const moduleName = correspondingPursPath.split('/')[0].toLowerCase();
          const outputName = `js/${moduleName}`;
          const virtualKey = `virtual:${moduleName}`;

          // Avoid duplicates if the . pure has already been added
          if (!entryPoints[outputName]) {
            entryPoints[outputName] = virtualKey;
            virtualEntries[virtualKey] = {
              module: correspondingPursPath.replace('.purs', '').replace('/', '.'),
              resolveDir: process.cwd()
            };
            console.log(`✅ Corresponding PURS entry point found: ${correspondingPursPath} -> ${virtualKey}`);
          }
        } else {
          console.log(`ℹ️  No matching .purs file found for: ${cleanPath}`);
        }
      } else {
        console.warn(`⚠️  Missing PUG file: ${fullPath}`);
      }
    }
  }

  // Recursive function to browse all the manifest properties
  function scanManifestProperties(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        // Process direct file paths
        addSourceFile(value, currentPath);
      } else if (Array.isArray(value)) {
        // Process file tables
        value.forEach(item => {
          if (typeof item === 'string') {
            addSourceFile(item, currentPath);
          } else if (typeof item === 'object' && item !== null) {
            scanManifestProperties(item, currentPath);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Recursion for nested objects
        scanManifestProperties(value, currentPath);
      }
    }
  }

  // Scan all the manifest
  scanManifestProperties(manifest);

  console.log('📄 Entry points detected:', entryPoints);
  console.log('📄 PUG files detected:', pugFiles);

  return { entryPoints, pugFiles, virtualEntries };
}

module.exports = { getEntryPointsFromManifest };
