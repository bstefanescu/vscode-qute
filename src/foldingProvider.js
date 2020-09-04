
const { FoldingRange } = require('vscode');
const { reduceEachLeadingCommentRange } = require('typescript');
const { throws } = require('assert');

const TAG_RX = /^<((?:[a-zA-Z_][a-zA-Z0-9_-]*:)?[a-zA-Z_][a-zA-Z0-9_-]*)(?:\s+[^>]*)?>$/;

const COMMENT_RX = /\/\*.*?\*\//g;
const DQ_STRING_RX = /".*?"/g;
const SQ_STRING_RX = /'.*?'/g;

function JsFolding() {
    this.comment = null;
    this.stack = [];
}
JsFolding.prototype = {
    cleanup(line) {
        return this.removeComments(this.removeStrings(line));
    },
    removeStrings(line) {
        if (line.indexOf('"') > -1) {
            line = line.replace(DQ_STRING_RX, () => '');
        }
        if (line.indexOf("'") > -1) {
            line = line.replace(SQ_STRING_RX, () => '');
        }
        return line;
    },
    removeComments(line) {
        if (line.indexOf('/*') > -1) {
            line = line.replace(COMMENT_RX, () => '');
        }
        let i = line.indexOf('//');
        if (i > -1) {
            line = line.substring(0, i).trim();
        }
        return line;
    },
    countChar(text, ch) {
        let cnt = 0;
        let i = text.indexOf(ch);
        while (i > -1) {
            cnt++;
            i = text.indexOf(ch, i+1);
        }
        return cnt;
    },
    checkBoundary(line, index, result) {
        if (line.startsWith('<q:')) {
            if (line.startsWith('<q:template')) {
                return new TemplateFolding(index);
            } else if (line.startsWith('<q:style')) {
                return new CssFolding(index);
            }
        }
        return null;
    },
    processLine(line, index, result) {
        if (this.comment != null) {
            let i = line.indexOf('*/');
            if (i > -1) {
                result.push(new FoldingRange(this.comment, index, 1));
                this.comment = null;
                //TODO process the remaining of the line
            }
            return null;
        }
        line = this.cleanup(line);
        if (line.indexOf('/*') > -1) {
            this.comment = index;
            //TODO process the begining of the line
            return null;
        }
        // check for block { ... } regions
        let open = this.countChar(line, '{');
        let closed = this.countChar(line, '}');
        if (open < closed) {
            for (var i=open; i<closed; i++) {
                let start = this.stack.pop();
                if (start == null) {
                    break;
                }
                result.push(new FoldingRange(start, index, 3));
            }
        } else if (open > closed) {
            for (var i=closed; i<open; i++) {
                this.stack.push(index);
            }
        } else {
            return this.checkBoundary(line, index, result);
        }
        return null;
    }
}


function CssFolding(index) {
    this.comment = null;
    this.stack = [];
    this.index = index;
}
CssFolding.prototype = Object.assign({}, JsFolding.prototype);
CssFolding.prototype.cleanup = function(line) {
    return this.removeComments(line);
}
CssFolding.prototype.checkBoundary = function(line, index, result) {
    if (line === '</q:style>') {
        result.push(new FoldingRange(this.index, index, 3));
        return new JsFolding(index);
    }
    return null;
}

function TemplateFolding(lineIndex) {
    this.index = lineIndex;
    this.currentTag = null;
    this.stack = [];
}
TemplateFolding.prototype = {
    processLine(line, index, result) {
        if (this.currentTag && this.currentTag.closeTag === line) {
            result.push(new FoldingRange(this.currentTag.start, index, 3));
            this.currentTag = this.stack.pop();
        } else if (line.startsWith('<')) {
            let m = TAG_RX.exec(line);
            if (m) {
                if (this.currentTag) {
                    this.stack.push(this.currentTag);
                }
                this.currentTag = {
                    start: index,
                    isStyle: m[1] === 'q:style',
                    closeTag: '</'+m[1]+'>'
                };
            } else {
                return this.checkBoundary(line, index, result);
            }
        }
        return null;
    },
    checkBoundary(line, index, result) {
        if (line === '</q:template>') {
            result.push(new FoldingRange(this.index, index, 3));
            return new JsFolding(index);
        }
        return null;
    }
}

function QuteFoldingProvider() {
}
QuteFoldingProvider.prototype = {
    provideFoldingRanges(document, context, cancelationToken) {
        let processor = new JsFolding();
        var result = [];
        var lines = document.getText().split('\n');
        for (var i=0,l=lines.length; i<l; i++) {
            var line = lines[i].trim();
            if (line) {
                let p = processor.processLine(line, i, result);
                if (p) processor = p;
            }
        }
        return result;
    }
}

module.exports = QuteFoldingProvider;