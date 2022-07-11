import { defineConfig, splitVendorChunkPlugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    minify: false
  },
  plugins: [vue(), splitVendorChunkPlugin()]
})
