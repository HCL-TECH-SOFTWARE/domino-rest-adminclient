const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Path to the index.html file
const filePath = path.join(__dirname, 'index.html');

// Read the environment variable
const buildVersion = process.env.REACT_APP_ADMIN_UI_BUILD_VERSION || new Date().toISOString();

// Read the index.html file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading index.html:', err);
    process.exit(1);
  }

  const dom = new JSDOM(data);
  const document = dom.window.document;
  let buildVersionElement = document.querySelector('meta[name="admin-ui-daily-build-version"]');

  if (!buildVersionElement) {
    buildVersionElement = document.createElement('meta');
    buildVersionElement.setAttribute('name', 'admin-ui-daily-build-version');
    document.head.appendChild(buildVersionElement);
  }
  buildVersionElement.setAttribute('content', buildVersion);
  const result = dom.serialize();

  // Write the modified content back to the index.html file
  fs.writeFile(filePath, result, 'utf8', (err) => {
    if (err) {
      console.error('Error writing index.html:', err);
      process.exit(1);
    }
    console.log('index.html has been updated with the build version.');
  });
});
