
import type { UserConfig, Plugin } from 'vite'
import { defineConfig, createFilter } from 'vite'
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

const tableReg = (): Plugin => {
  const transform = (code: string, transformTable?: (table: any) => any) => {
    let table = JSON.parse(code.slice(code.indexOf('{'), code.lastIndexOf('}') + 1))
    table = transformTable?.(table) ?? table
    let keys = Object.keys(table)
    keys.sort((a, b) => b.length - a.length)
    keys = keys.map(s => s.replace(/\\/g, '\\\\'))
    return `\
export default ${JSON.stringify(table)}
export const reg = RegExp(${JSON.stringify(keys.join('|'))}, 'g')
`
  }
  function* xreverse(entries: [string, unknown][]) {
    for (const [key, values] of entries) {
      for (const value of String(values).split(',')) {
        yield [value, key]
      }
    }
  }
  return {
    name: 'table-reg',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('?table-reg')) {
        return transform(code)
      }
      if (id.endsWith('?table-reg&reverse')) {
        return transform(code, (table) => {
          return Object.fromEntries(xreverse(Object.entries(table)))
        })
      }
    }
  }
}

const externalAssets = ((): {
  renderBuiltUrl: UserConfig['experimental']['renderBuiltUrl']
  plugin: Plugin
} => {
  const reg = /\/(ionicons)-[\da-f]{8}\.((?!woff2)\S+)$/
  return {
    renderBuiltUrl(fileName, { type, hostId, hostType }) {
      if (hostType === 'css') {
        const m = fileName.match(reg)
        if (m != null) { return `data:text/plain,${m[1]}.${m[2]}` }
      }
      return { relative: true }
    },
    plugin: {
      name: 'external-assets',
      generateBundle(options, bundle) {
        for (const fileName of Object.keys(bundle)) {
          const m = fileName.match(reg)
          if (m != null) { delete bundle[fileName] }
        }
      }
    }
  }
})()

export default defineConfig({
  appType: 'mpa',
  root: 'src',
  base: './',
  publicDir: '../public',
  cacheDir: '../node_modules/.vite',
  resolve: {
    extensions: ['.js', '.ts', '.json', '.vue']
  },
  experimental: { renderBuiltUrl: externalAssets.renderBuiltUrl },
  build: {
    outDir: '../dist',
    emptyOutDir: false,
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
        transform: {
          order: 'post',
          handler(code, id) {
            if (id === '\0vite/preload-helper') {
              return `export const __vitePreload = ''`
            }
            if (id === '\0vite/modulepreload-polyfill') { return '' }
            if (code.includes('__vitePreload(')) {
              return code.replace(/__vitePreload\(\(\) => ([^,]+),__VITE_IS_MODERN__\?"__VITE_PRELOAD__"\:void 0,import\.meta\.url\)/, '$1')
            }
          }
        }
      }]
    }
  },
  plugins: [
    vue(),
    ipinyinjs(),
    tableReg(),
    externalAssets.plugin,
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
      name: 'html-transform',
      transformIndexHtml(html, { chunk, bundle }) {
        if (chunk == null || bundle == null) { return }
        return {
          html: html.replace(/(?<=\<script type="module"\s+)crossorigin\s+/g, ''),
          tags: [...function* () {
            for (const href of chunk.dynamicImports) {
              yield {
                tag: 'link',
                attrs: { rel: 'modulepreload', href: `./${href}` },
                injectTo: 'head' as 'head'
              }
            }
          }()]
        }
      }
    }
  ]
})
