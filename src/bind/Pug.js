import pug from 'pug';
import fs from 'fs';
import path from 'path';

export const renderFileImpl = function(templatePath, data) {
  return pug.renderFile(templatePath, data);
};

export const writeFileImpl = function(filePath, content, unit) {
  fs.writeFileSync(filePath, content, 'utf8');
  return unit;
};

export const ensureDirImpl = function(dirPath, unit) {
  fs.mkdirSync(dirPath, { recursive: true });
  return unit;
};

export const copyDirImpl = function(src, dest, unit) {
  function copyRecursive(source, destination) {
    if (fs.statSync(source).isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      fs.readdirSync(source).forEach(file => {
        copyRecursive(path.join(source, file), path.join(destination, file));
      });
    } else {
      fs.copyFileSync(source, destination);
    }
  }

  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
  }
  return unit;
};
