import { defineConfig, splitVendorChunkPlugin, Plugin, createFilter } from 'vite'
import vue from '@vitejs/plugin-vue'
import { marked } from 'marked'
// https://vitejs.dev/config/
const ipinyinjs = (): Plugin => {
  const filter = createFilter(['node_modules/ipinyinjs/**'])
  return {
    name: 'ipinyinjs',
    transform(code, id) {
      if (!filter(id)) { return null }
      if (id.endsWith('node_modules/ipinyinjs/dict/pinyin_dict_withtone.js')) {
        return `export ${code}`
      }
      if (id.endsWith('node_modules/ipinyinjs/pinyinUtil.js')) {
        return `\
import { pinyin_dict_withtone } from 'ipinyinjs/dict/pinyin_dict_withtone'
var window = { pinyin_dict_withtone }, module
${code}
export const { pinyinUtil } = window`
      }
    }
  }
}
export default defineConfig({
  base: './',
  resolve: {
    extensions: ['.js', '.ts', '.json', '.vue']
  },
  build: {
    target: 'esnext',
    modulePreload: { polyfill: true },
    cssCodeSplit: false,
    minify: false,
    rollupOptions: {
      output: {
        minifyInternalExports: false
      },
      plugins: [{
        name: 'my-preload',
        renderChunk(code) {
          if (code.includes('__VITE_IMPORT__')) {
            return code.replace('__VITE_IMPORT__', 'import')
          }
        },
        transform(code, id) {
          if (id === '\0vite/preload-helper') {
            return `\
export const __vitePreload = (baseModule, deps, importerUrl) => {
  if (deps?.length > 0) for (const dep of deps) {
    __VITE_IMPORT__(new URL(dep, importerUrl).href)
  }
  return baseModule()
}`
          }
          if (id === '\0vite/modulepreload-polyfill') { return '' }
        }
      }]
    }
  },
  plugins: [
    vue(),
    //splitVendorChunkPlugin(),
    ipinyinjs(),
    {
      name: 'view-ui-plus',
      enforce: 'pre',
      resolveId(source, importer, options) {
        if (source === 'view-ui-plus') { return source }
      },
      load(id) {
        if (id === 'view-ui-plus') {
          return `\
export * from 'view-ui-plus/src/components/index'
import pkg from 'view-ui-plus/package.json'
export const version = pkg.version`
        }
      }
    },
    {
      name: 'markdown',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('?markdown')) {
          const info = marked.parse(code).replace(/\<a ([^>]*)\>/g, '<a target="_blank" $1>')
          return `export default ${JSON.stringify(info)}`
        }
      }
    },
    {
      name: 'table-reg',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('?table-reg')) {
          const table = JSON.parse(code.slice(code.indexOf('{'), code.lastIndexOf('}') + 1))
          let keys = Object.keys(table)
          keys.sort((a, b) => b.length - a.length)
          keys = keys.map(s => s.replace(/\\/g, '\\\\'))
          return `export default RegExp(${JSON.stringify(keys.join('|'))}, 'g')`
        }
      }
    },
    {
      name: 'node-wav',
      transform(code, id) {
        if (id.endsWith('node_modules/node-wav/index.js')) {
          return `const Buffer=Object\n${code}`
        }
      }
    }
  ]
})
