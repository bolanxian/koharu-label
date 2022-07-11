import { defineConfig, splitVendorChunkPlugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
const { resolve } = path
// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    minify: false,
    /* lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      name: 'MyLib',
      formats: ['es'],
      fileName: (format) => `my-lib.${format}.js`
    },*/
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        //nested: resolve(__dirname, 'nested/index.html')
      }
      /* external: ['vue', 'axios', '@ygoe/msgpack', 'marked', 'view-ui-plus', 'view-ui-plus/dist/styles/viewuiplus.css', 'zod'],
      output: {
        format: 'umd',
        globals: {
          'vue': 'Vue',
          'axios': 'axios',
          '@ygoe/msgpack': 'msgpack',
          'marked': 'marked',
          'view-ui-plus': 'iview',
          'zod': 'z'
        }
      }*/
    }
  },
  plugins: [vue(), splitVendorChunkPlugin()]
})
