
import * as Vue from "vue"
import * as iview from "view-ui-plus"
import msgpack from '@ygoe/msgpack'
import * as z from 'zod'
import App from './components/app.vue'

import './components/drop-file.vue'
import './components/awaiter.vue'

let isPages = location.hostname.match(/(?<=\.)git[\w-]+(?=\.io$)/i) || location.protocol === "file:" || import.meta.env.DEV
if (typeof WebAssembly === 'undefined') { isPages = !1 }
const baseURL = isPages ? 'http://127.0.0.1:6701/' : '/'
const app = Vue.createApp(App, {
  isPages, baseURL, 'onMount:app'(value: any) {
    (window as any).vm = value
  }
})
const vm = app.mount('#app')
const exports = {
  Vue, iview, msgpack, z, app, vm
}
export default exports
Object.assign(window, exports)
