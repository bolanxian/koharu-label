
import { defineComponent, createVNode as h, shallowRef as sr, onUnmounted, getCurrentInstance } from 'vue'
import { Spin } from 'view-ui-plus'
import { Awaiter, AwaiterState } from './awaiter.vue'
import type { Module } from './apps'
let APPS: Promise<typeof import('./apps')>

const handleFulfilled = (module: Module) => {
  if (module != null) { document.title = module.name }
}
const getModuleAsync = async (hash = location.hash) => {
  if (import.meta.env.DEV) switch (hash) {
    case '#error': return Promise.reject(hash)
    case '#loading': return new Promise<never>(() => { })
  }
  APPS ??= import('./apps')
  return (await APPS).getModule(hash)
}

export const App = defineComponent({
  setup(props, ctx) {
    const module = sr(getModuleAsync())
    const handleHashchange = (e: HashChangeEvent) => {
      module.value = getModuleAsync()
    }
    window.addEventListener('hashchange', handleHashchange)
    onUnmounted(() => window.removeEventListener('hashchange', handleHashchange))
    const $ = getCurrentInstance()!
    let awaiterSlots
    return () => h(Awaiter, { promise: module.value, onFulfilled: handleFulfilled }, awaiterSlots ??= {
      default: (state: AwaiterState, module: Module) => {
        let vnode = null
        if (state === 'fulfilled' && module != null) {
          vnode = h(module, $.attrs, $.slots)
          vnode.ref = $.vnode.ref
        }
        return [
          h(Spin, { show: state === 'pending', size: 'large', fix: true }),
          vnode
        ]
      },
      rejected: () => h('div', { class: 'ivu-loading-bar', style: 'height: 2px' }, [
        h('div', {
          class: 'ivu-loading-bar-inner ivu-loading-bar-inner-failed-color-error',
          style: 'height: 2px'
        })
      ])
    })
  }
})