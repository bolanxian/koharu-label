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
    polyfillModulePreload: false,
    cssCodeSplit: false,
    minify: false
  },
  plugins: [
    vue(),
    //splitVendorChunkPlugin(),
    ipinyinjs(),
    {
      name: 'markdown',
      transform(code, id) {
        if (id.endsWith('?markdown')) {
          const info = marked.parse(code).replace(/\<a ([^>]*)\>/g, '<a target="_blank" $1>')
          return `export default ${JSON.stringify(info)}`
        }
      }
    }
  ]
})
