
export const getModule = (hash = location.hash) => {
  if (import.meta.env.DEV) switch (hash) {
    case '#error': return Promise.reject(hash)
    case '#loading': return new Promise<never>(() => { })
  }
  switch (hash) {
    case '#syncer': return import('./koharu-label/syncer.vue')
    case '#lyric': return import('./lyric-transfer/main.vue')
    case '': return import('./koharu-label/main.vue')
  }
  return null
}

const getFirstModule = async <T>(APP: Promise<T>, hash = location.hash) => {
  let timer
  await Promise.any([APP, new Promise(ok => { timer = setTimeout(ok, 1000) })])
  clearTimeout(timer)
  return getModule(hash)
}
const getBackend = (el = document.documentElement) => {
  let backend = el.dataset.backend ?? ''
  if (backend === '{{backend}}') { backend = '' }
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
!(async () => {
  const root = document.getElementById('app')!
  try {
    root.textContent = '加载中'
    const APP = import('./components/app.vue')
    const firstModule = getFirstModule(APP)
    const backend = getBackend()
    const baseURL = getBaseURL(backend)
    const { createApp, App } = await APP
    const app = createApp(App, {
      backend, baseURL, firstModule, 'onMount:app'(value: any) {
        (window as any).vm = value
      }
    })
    const vm = app.mount(root)
    if (import.meta.env.DEV) { Object.assign(window, { app, vm }) }
  } catch (error) {
    root.textContent = '加载失败'
    throw error
  }
})()
