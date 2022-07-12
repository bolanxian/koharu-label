
import * as Vue from "vue"
import * as iview from "view-ui-plus"
import axios from 'axios'
import msgpack from '@ygoe/msgpack'
import * as z from 'zod'
import Main from './components/main.vue'
import { Main as Syncer } from './components/syncer.vue'
import 'view-ui-plus/dist/styles/viewuiplus.css'
import './assets/utils.css'
const opts = Vue.ref()
const App = (() => {
  switch (location.hash) {
    case '#syncer': return Syncer
  }
  switch (location.search) {
    case '?syncer': return Syncer
  }
  return Main
})()
const app = Vue.createApp(App, {
  baseURL: import.meta.env.DEV ? 'http://127.0.0.1:6701/' : '/',
  opts
})
app.mount('#app')
document.title = App.name
export const exports = {
  Vue, iview, axios, msgpack, z,
  app, options: opts.value
}
export default exports
Object.assign(window, exports)