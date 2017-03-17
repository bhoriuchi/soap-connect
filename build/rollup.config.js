import babel from 'rollup-plugin-babel'

export default {
  entry: 'src/index.js',
  format: 'cjs',
  plugins: [ babel() ],
  dest: 'index.js',
  external: ['lodash', 'url', 'events', 'fs', 'path', 'xmldom', 'request', 'node-localstorage', 'xmlbuilder']
}