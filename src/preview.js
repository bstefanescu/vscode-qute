const path =  require('path');
const vscode = require('vscode');
const build = require('./buildPreview.js');

function getWebviewContent(fileName, script) {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cat Coding</title>
  </head>
  <body>
      Hello! ${fileName}
      <hr>
      <div id='preview'></div>
      <script>
        const vscode = acquireVsCodeApi();
        ${script}
      </script>
  </body>
  </html>`;
}

function getWebviewLoadingContent(fileName) {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cat Coding</title>
  </head>
  <body>
        <h1>Loading ... </h1>
  </body>
  </html>`;
}

function Preview(mgr, document) {
    this.document = document;
    this.panel = vscode.window.createWebviewPanel(
        'qutejs_preview', // Identifies the type of the webview. Used internally
        'Qute Commponent Preview', // Title of the panel displayed to the user
        vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
        {
            enableScripts: true
        }
    );
    this.baseName = path.basename(this.document.fileName);
    this.panel.webview.html = getWebviewLoadingContent(this.baseName);
    this.panel.title = "Preview";
    mgr.disposables.push(this.panel.onDidDispose(() => {
        mgr.previewClosed(this);
    }));
}
Preview.prototype = {
    update() {
        // build document then open
        return build(this.document.fileName, this.document.getText()).then(script => {
            this.panel.webview.html = getWebviewContent(this.baseName, script);
        });
    }
}

module.exports = Preview;