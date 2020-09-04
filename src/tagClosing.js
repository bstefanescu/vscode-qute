/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

 /*
 This file is an adaptation from vscode html tagClosing.ts file
 */

const { window, workspace, commands, Disposable, Position, SnippetString, Selection } = require('vscode');

function activateTagClosing(tagProvider, supportedLanguages, configName) {

	let disposables = [];
	workspace.onDidChangeTextDocument(event => onDidChangeTextDocument(event.document, event.contentChanges), null, disposables);

	let isEnabled = false;
	updateEnabledState();
	window.onDidChangeActiveTextEditor(updateEnabledState, null, disposables);

	let timeout = undefined;

	function updateEnabledState() {
		isEnabled = false;
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		let document = editor.document;
		if (!supportedLanguages[document.languageId]) {
			return;
        }
		if (!workspace.getConfiguration(undefined, document.uri).get(configName)) {
			return;
        }
		isEnabled = true;
	}

	function onDidChangeTextDocument(document, changes) {
		if (!isEnabled) {
			return;
		}
		let activeDocument = window.activeTextEditor && window.activeTextEditor.document;
		if (document !== activeDocument || changes.length === 0) {
			return;
        }
		if (typeof timeout !== 'undefined') {
			clearTimeout(timeout);
		}
        let lastChange = changes[changes.length - 1];
        if (lastChange.rangeLength > 0) return;
        let lastCharacter = lastChange.text[lastChange.text.length - 1];
        // -------------------------------
        // check ENTER inside <tag>|</tag>
        if (lastCharacter === '\n') {
            let rangeStart = lastChange.range.start;
            let line = document.lineAt(rangeStart);
            var prevText = line.text[rangeStart.character-1];
            if (prevText === '>') {
                let nextLine = document.lineAt(rangeStart.line+1);
                if (nextLine && nextLine.text.trim().startsWith('</')) {
                    enterBlockElement(rangeStart);
                }
            }
            return;
        }
        // --------------------------------
		if (lastCharacter !== '>' && lastCharacter !== '/') {
			return;
		}
		let rangeStart = lastChange.range.start;
		let version = document.version;
		timeout = setTimeout(() => {
			let position = new Position(rangeStart.line, rangeStart.character + lastChange.text.length);
			tagProvider(document, position).then(text => {
				if (text && isEnabled) {
					let activeEditor = window.activeTextEditor;
					if (activeEditor) {
						let activeDocument = activeEditor.document;
						if (document === activeDocument && activeDocument.version === version) {
                            let selections = activeEditor.selections;
                            var insertResult;
							if (selections.length && selections.some(s => s.active.isEqual(position))) {
                                insertResult = activeEditor.insertSnippet(new SnippetString(text), selections.map(s => s.active));
							} else {
								insertResult = activeEditor.insertSnippet(new SnippetString(text), position);
                            }

                            insertResult.then(success => {
                                if (success) {
                                    activeEditor.selection = new Selection(position, position);
                                }
                            })

						}
					}
				}
			});
			timeout = undefined;
		}, 100);
	}
	return Disposable.from(...disposables);
}


function enterBlockElement(position) {
    /*
    line.firstNonWhitespaceIndex
    window.activeTextEditor.edit(edit => {
        edit.insert(position, "\n");
    });
    */

    commands.executeCommand('editor.action.insertLineBefore').then(
        () => {
            commands.executeCommand('editor.action.indentLines');
        }
    ).finally(() => {
        handlingEnter = false;
    });

}

module.exports = activateTagClosing;
