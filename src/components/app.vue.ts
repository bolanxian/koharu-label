
import { defineComponent, createVNode, shallowRef as sr, onUnmounted } from 'vue'
const h = createVNode
import { Icon, Spin, Exception } from 'view-ui-plus'
import { Awaiter, AwaiterState } from './awaiter.vue'
import './drop-file.vue'
import { getModule } from '../main'

export { createApp } from 'vue'
export { ButtonGroup, Card, Input, Message } from 'view-ui-plus'

const renderEmpty = () => h(Exception, { type: 404, redirect: '#', style: 'height:100vh' })
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
    return { module }
  },
  methods: {
    handleFulfilled(module: Module) {
      if (module != null) { document.title = module.default.name }
    }
  },
  render() {
    return h(Awaiter, { promise: this.module, onFulfilled: this.handleFulfilled }, {
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
            type: 'ios-loading', size: 160, class: 'ivu-load-loop',
            style: isRejected ? 'animation-play-state:paused' : null
          }),
          h('div', null, [' '])
        ])
      }
    })
  }
})