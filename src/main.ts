
import * as Vue from "vue"
import * as iview from "view-ui-plus"
import axios from 'axios'
import msgpack from '@ygoe/msgpack'
import * as z from 'zod'
import App from './components/app.vue'

import './components/drop-file.vue'
import './components/awaiter.vue'

const dev = location.hostname.match(/(?<=\.)git[\w-]+(?=\.io$)/i) || location.protocol === "file:" || import.meta.env.DEV
const baseURL = dev ? 'http://127.0.0.1:6701/' : '/'
const app = Vue.createApp(App, {
  baseURL, 'onMount:app'(value: any) {
    (window as any).vm = value
  }
})
const vm = app.mount('#app')
const exports = {
  Vue, iview, axios, msgpack, z, app, vm
}
export default exports
Object.assign(window, exports)
