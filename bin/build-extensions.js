const exec = require('child_process').exec;
const colors = require('./lib/colors');

exec('web-ext build -s firefox-extension/ --overwrite-dest', (err, stdout, stderr) => {
  if (err) {
    console.log(colors.FgRed, 'Failed to build firefox-extension');
    return;
  }
  console.log(stdout)
  console.log(colors.FgGreen, 'Successfully built firefox-extension\n');
});