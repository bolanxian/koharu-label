
import * as Vue from "vue"
import * as iview from "view-ui-plus"
import msgpack from '@ygoe/msgpack'
import * as z from 'zod'
import App from './components/app.vue'

import './components/drop-file.vue'
import './components/awaiter.vue'

let backend = document.documentElement.dataset.backend ?? '{{backend}}'
if (backend === '{{backend}}') {
  let dev = import.meta.env.DEV
  if (dev) { backend = 'dev' } else {
    let pages = location.hostname.match(/(?<=\.)git[\w-]+(?=\.io$)/i)
    if (pages != null) { backend = 'pages:' + pages[0] }
    if (typeof WebAssembly === 'undefined') { backend = 'python' }
  }
}
const baseURL = new URL('/', location.href).href
const app = Vue.createApp(App, {
  backend, baseURL, 'onMount:app'(value: any) {
    (window as any).vm = value
  }
})
const vm = app.mount('#app')
Object.assign(window, {
  Vue, iview, msgpack, z, app, vm
})
