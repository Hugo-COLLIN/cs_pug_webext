const fs = require('fs');

function cleanDirectoryPlugin(directory) {
  return {
    name: 'clean-directory',
    setup(build) {
      build.onStart(() => {
        if (fs.existsSync(directory)) {
          console.log(`🧹 Cleaning directory ${directory}...`);
          fs.rmSync(directory, { recursive: true });
        }
        fs.mkdirSync(directory, { recursive: true });
      });
    }
  };
}

module.exports = { cleanDirectoryPlugin };
