const vscode = require('vscode');
const Preview = require("./preview.js");

function PreviewManager(disposables) {
    this.previews = {};
    this.disposables = disposables;
}
PreviewManager.prototype = {
    open(document) {
        if (!document) {
            let editor = vscode.window.activeTextEditor;
            if (!editor) {
                return null;
            }
            document = editor.document;
        }
        if (document.languageId !== 'qutejs') return null;
        let preview = this.previews[document.fileName];
        if (!preview) {
            preview = new Preview(this, document);
            this.previews[document.fileName] = preview;
        }
        preview.update();
        return preview;
    },
    update(document) {
        const preview = this.previews[document.fileName];
        if (preview) {
            preview.update().then(() => {
                if (!preview.panel.visible) {
                    preview.panel.reveal(vscode.ViewColumn.Beside, true);
                }
            });
        }
    },
    previewClosed(preview) {
        delete this.previews[preview.document.fileName];
    },
    documentClosed(document) {
        var preview = this.previews[document.fileName];
        if (preview) {
            preview.panel.dispose();
            delete this.previews[document.fileName];
        }
    }
}

module.exports = PreviewManager;
