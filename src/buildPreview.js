const path = require('path');
const fs = require('fs');

const rollup = require('rollup');
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const buble = require('@rollup/plugin-buble');
const postcss = require('rollup-plugin-postcss');
const qute = require('@qutejs/rollup-plugin-qute');
const quteCss = require('postcss-qute');

const tempDir = path.resolve(__dirname, '../tmp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
let ID_GEN = 0;
function getPreviewFile(file) {
    return file+'-'+(ID_GEN++)+'.js';
}

function createPreviewContent(componentFile) {
    return `
        import Component from "${componentFile}";
        new Component().mount('preview');
    `;
}
function qutePreviewPlugin(compontentFile) {
    return {
      name: 'qute-preview-plugin',
      resolveId (source) {
        if (source === '#preview.js') {
          return source;
        }
        return null;
      },
      load (id) {
        if (id === '#preview.js') {
          // the source code for "virtual-module"
          return createPreviewContent(compontentFile);
        }
        return null;
      }
    };
  }

function build(file, content) {
    const output = getPreviewFile(file);
    return rollup.rollup({
        input: '#preview.js',
        external: [ '@qutejs/window' ],
        plugins: [
            qutePreviewPlugin(file),
            nodeResolve ({preferBuiltins: true}),
            commonjs(),
            postcss({
                inject: false,
                plugins: [quteCss()]
            }),
            qute(),
            buble({
                exclude: ["node_modules/**", "**/node_modules/**"],
                include: ["**/*.js", "**/*.jsq"]
            })
        ]
    }).then(bundle => {
        return bundle.write({
            file: output,
            name: 'QutePreview',
            format: 'iife',
            globals: {
                '@qutejs/window': 'window'
            }
        }).then(bundle => {
            try {
                return fs.readFileSync(output);
            } finally {
                fs.unlinkSync(output);
            }
        });
    })

}

module.exports = build;