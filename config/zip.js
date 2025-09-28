const fs = require('fs');
const { zip } = require('zip-a-folder');

(async () => {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const archiveName = `${pkg.name}_${pkg.version}_${process.env.TARGET_BROWSER}.zip`;

  if (!fs.existsSync('releases')) fs.mkdirSync('releases');

  await zip('dist', `releases/${archiveName}`);
  console.log(`✅ Created ${archiveName}`);
})();
