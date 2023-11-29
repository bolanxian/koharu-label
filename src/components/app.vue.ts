
import { defineComponent, createVNode as h, shallowRef as sr, onBeforeUnmount } from 'vue'
import { LoadingBar, Spin } from './spinner.vue'
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
  emits: ['mount:app'],
  inheritAttrs: false,
  setup(props, { attrs, slots, emit }) {
    const module = sr(getModuleAsync())
    const handleHashchange = (e: HashChangeEvent) => {
      module.value = getModuleAsync()
    }
    window.addEventListener('hashchange', handleHashchange)
    onBeforeUnmount(() => window.removeEventListener('hashchange', handleHashchange))
    const ref = (vm: any) => { emit('mount:app', vm) }
    let render
    return () => h(Awaiter, {
      promise: module.value, onFulfilled: handleFulfilled
    }, render ??= (state: AwaiterState, module: NonNullable<Module>) => {
      if (state === 'fulfilled' && module == null) { state = 'rejected' }
      return [
        state === 'fulfilled' ? h(module, { ...attrs, ref }, slots) : null,
        h(LoadingBar, { state }),
        h(Spin, { show: state === 'pending' })
      ]
    })
  }
})