const manifest = require('../chrome-extension/manifest.json');
const fs = require('fs');

const FgGray = "\x1b[90m", FgMagenta = "\x1b[36m";

const DebugColor = `${FgGray}`, SuccessColor = `${FgMagenta}`;

// delete all the firefox folder contents
fs.rmSync('firefox-extension', { recursive: true });
console.log(DebugColor, 'Deleted firefox-extension folder');

// create the firefox folder
fs.mkdirSync('firefox-extension');
console.log(DebugColor, 'Created firefox-extension folder');

// copy all the chrome folder contents recursively to the firefox folder
fs.cpSync('chrome-extension', 'firefox-extension', { recursive: true });
console.log(DebugColor, 'Copied chrome-extension folder to firefox-extension folder');


// update the manifest
const firefoxManifest = {
  ...manifest,
  background: {
    scripts: ['background.js'],
  }
}

fs.writeFileSync('firefox-extension/manifest.json', JSON.stringify(firefoxManifest, null, 2));
console.log(DebugColor, 'Updated manifest.json');


console.log("\n");
console.log(SuccessColor, 'Successfully converted chrome-extension to firefox-extension');
console.log("\n");
console.log(SuccessColor, 'To test the extension, run the following command:');
console.log(DebugColor, '\tweb-ext run -s firefox-extension');
console.log("\n");
