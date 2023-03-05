const manifest = require('../chrome-extension/manifest.json');
const fs = require('fs');
const exec = require('child_process').exec;

const colors = require('./lib/colors');

const DebugColor = colors.FgGray, SuccessColor = colors.FgGreen, ErrorColor = colors.FgRed;

// delete all the firefox folder content, if it exists
if (fs.existsSync('firefox-extension')) {
  fs.rmSync('firefox-extension', {recursive: true});
  console.log(DebugColor, 'Deleted firefox-extension folder');
}

// create the firefox folder
fs.mkdirSync('firefox-extension');
console.log(DebugColor, 'Created firefox-extension folder');

// copy all the chrome folder contents recursively to the firefox folder
fs.cpSync('chrome-extension', 'firefox-extension', {recursive: true});
console.log(DebugColor, 'Copied chrome-extension folder to firefox-extension folder');


// update the manifest
const firefoxManifest = {
  ...manifest, background: {
    scripts: ['background.js'],
  }, browser_specific_settings: {
    gecko: {
      id: "firefox@umn.lol"
    }
  }
}

fs.writeFileSync('firefox-extension/manifest.json', JSON.stringify(firefoxManifest, null, 2));
console.log(DebugColor, 'Updated manifest.json');


console.log("\n");
console.log(SuccessColor, 'Successfully converted chrome-extension to firefox-extension\n');
console.log(SuccessColor, 'Running firefox-extension...\n');


// check if web-ext is installed on path
// if not, install it

exec('web-ext --version', (err, stdout, stderr) => {
  if (err) {
    console.log(DebugColor, 'web-ext not found on path. Installing...');
    exec('npm install --global web-ext', (err, stdout, stderr) => {
      if (err) {
        console.log(ErrorColor, 'Failed to install web-ext. Please install it manually.');
        return;
      }
      console.log(SuccessColor, 'Successfully installed web-ext');
    });
  } else {
    console.log(DebugColor, 'web-ext found on path');
  }
  exec('web-ext run -s firefox-extension --start-url https://schedulebuilder.umn.edu', (err, stdout, stderr) => {
    if (err) {
      console.log(ErrorColor, 'Failed to run firefox-extension');
      return;
    }
    console.log(SuccessColor, 'Successfully ran firefox-extension');
  });
});