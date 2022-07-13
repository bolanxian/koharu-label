
import * as Vue from "vue"
import * as iview from "view-ui-plus"
import axios from 'axios'
import msgpack from '@ygoe/msgpack'
import * as z from 'zod'
import Main from './components/main.vue'
import { Main as Syncer } from './components/syncer.vue'
import 'view-ui-plus/dist/styles/viewuiplus.css'
import './assets/utils.css'
const App = (() => {
  switch (location.hash) {
    case '#syncer': return Syncer
  }
  switch (location.search) {
    case '?syncer': return Syncer
  }
  return Main
})()
document.title = App.name
const baseURL = location.hostname.match(/(?<=\.)git[\w-]+(?=\.io$)/i) && import.meta.env.DEV ? 'http://127.0.0.1:6701/' : '/'
const opts = Vue.ref()
const app = Vue.createApp(App, { baseURL, opts })
app.mount('#app')
export const exports = {
  Vue, iview, axios, msgpack, z,
  app, options: opts.value
}
export default exports
Object.assign(window, exports)