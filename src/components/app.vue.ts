
import { defineComponent, createVNode as h, shallowRef as sr, onUnmounted } from 'vue'
import { Icon, Spin } from 'view-ui-plus'
import { Awaiter, AwaiterState } from './awaiter.vue'
import './drop-file.vue'
import { getModule } from '../main'

export { createApp } from 'vue'
export { ButtonGroup, Card, Input, Message } from 'view-ui-plus'

const handleFulfilled = (module: Module) => {
  if (module != null) { document.title = module.default.name }
}
const renderEmpty = () => null
export type getModule = ReturnType<typeof getModule>
export type Module = Awaited<getModule>
export const App = defineComponent({
  props: { firstModule: null },
  setup(props, ctx) {
    const module = sr<getModule>(props.firstModule)
    const handleHashchange = (e?: HashChangeEvent) => {
      module.value = getModule()
    }
    window.addEventListener('hashchange', handleHashchange)
    onUnmounted(() => window.removeEventListener('hashchange', handleHashchange))
    return { module, awaiterSlots: null as any }
  },
  render() {
    return h(Awaiter, { promise: this.module, onFulfilled: handleFulfilled }, this.awaiterSlots ??= {
      fulfilled: (module: Module) => {
        if (module == null) { return renderEmpty() }
        const vnode = h(module.default, this.$attrs, this.$slots)
        vnode.ref = this.$.vnode.ref
        return vnode
      },
      empty: renderEmpty,
      default: (state: AwaiterState) => {
        const isRejected = state === 'rejected'
        return h(Spin, { style: isRejected ? 'color:#F00' : null, fix: true }, () => [
          h(Icon, {
            type: 'ios-loading', size: 80, class: 'ivu-load-loop',
            style: isRejected ? 'animation-play-state:paused' : null
          }),
          h('div', { style: 'margin: 20px' }, [isRejected ? '加载失败' : '加载中'])
        ])
      }
    })
  }
})