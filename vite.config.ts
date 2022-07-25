import { defineConfig, splitVendorChunkPlugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    minify: false,
    target: 'esnext',
    cssCodeSplit: false
  },
  plugins: [vue(), splitVendorChunkPlugin()]
})
