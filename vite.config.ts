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
        return `
import { pinyin_dict_withtone } from 'ipinyinjs/dict/pinyin_dict_withtone'
var window = { pinyin_dict_withtone }, module
${code}
export default window.pinyinUtil`
      }
    }
  }
}
export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    modulePreload: { polyfill: false },
    cssCodeSplit: false,
    minify: false
  },
  plugins: [
    vue(),
    //splitVendorChunkPlugin(),
    ipinyinjs(),
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
