// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const activateTagClosing = require('./tagClosing.js');
const QuteFoldingProvider = require('./foldingProvider.js');
const PreviewManager = require('./previewManager.js');
// this method is called when your extension is activated
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const selector = { language: 'qutejs', scheme: '*' };

    //console.log('Qute extension activated');
    let toDispose = context.subscriptions;
    let disposable;

    const previewManager = new PreviewManager(toDispose);

    disposable = vscode.workspace.onDidSaveTextDocument(doc => {
        previewManager.update(doc);
    });
    toDispose.push(disposable);

    disposable = vscode.workspace.onDidCloseTextDocument(document => {
        previewManager.documentClosed(document);
    });
    toDispose.push(disposable);

    disposable = vscode.commands.registerCommand('qutejs.component.preview', () => {
        previewManager.open();
    });
    toDispose.push(disposable);

    disposable = activateTagClosing(tagProvider, { qutejs: true }, 'qutejs.autoClosingTags');
    toDispose.push(disposable);

    disposable = vscode.languages.registerFoldingRangeProvider(selector, new QuteFoldingProvider());

    disposable = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'qutejs') {
            insertAutoCloseTag(event.document, event.contentChanges);
        }
    })
    toDispose.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}

module.exports = {
	activate,
	deactivate
}

function tagProvider(document, position) {
    let text = document.getText(new vscode.Range(new vscode.Position(0,0), position));
    let tag = getLastOpenTag(text);
    let r = tag && !SIMPLE_TAGS[tag.toLowerCase()] ? '</'+tag+'>' : null;
    return Promise.resolve(r);
}

var SIMPLE_TAGS = {else:true, case:true, area:true, base:true, br:true, col:true, embed:true, hr:true, img:true, input:true, link:true, meta:true, param:true, source:true, track:true, wbr:true};
const TAG_RX = /^<([_a-zA-Z:]+[_a-zA-Z0-9:-]*)(?:\s+[_a-zA-Z:]+[_a-zA-Z0-9:-]*(?:\s*=\s*(?:(?:".*?")|(?:'.*?')|(?:{.*?})))?)*>$/;
function getLastOpenTag(text) {
    let i = text.lastIndexOf('<');
    if (i < 0) return null;
    var m = TAG_RX.exec(text.substring(i));
    return m && m[1];
}
