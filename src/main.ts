
import { createApp } from 'vue'
import { App } from './components/app.vue'

const getBackend = (el = document.documentElement) => {
  let backend = el.dataset.backend
  if (backend == null || backend === '{{backend}}') { backend = '' }
  if (!backend) {
    if (import.meta.env.DEV) { return 'dev' }
    let pages = location.hostname.match(/(?<=\.)git[\w-]+(?=\.io$)/i)
    if (pages != null) { backend = 'pages:' + pages[0] }
  }
  return backend
}
const getBaseURL = (backend: string) => {
  let baseURL = '/'
  if (backend === 'dev' || backend.startsWith('pages:')) {
    baseURL = 'http://127.0.0.1:6701/'
  }
  return baseURL
}

{
  const root = document.getElementById('app')!
  try {
    const backend = getBackend()
    const baseURL = getBaseURL(backend)
    const app = createApp(App, {
      backend, baseURL, 'onMount:app'(value: any) {
        (window as any).vm = value
      }
    })
    const vm = app.mount(root)
    if (import.meta.env.DEV) { Object.assign(window, { app, vm }) }
  } catch (error) {
    root.textContent = '加载失败'
    throw error
  }
}
