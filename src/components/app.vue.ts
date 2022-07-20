
import * as Vue from "vue"
const { defineComponent, createVNode: h, shallowRef: sr } = Vue
export default defineComponent({
  setup(props, ctx) {
    return {
      current: sr<Vue.Component | null>(null)
    }
  },
  methods: {
    async handleHashchange(e?: HashChangeEvent) {
      this.current = null
      let mod
      switch (location.hash) {
        case '#syncer': mod = import('../koharu-label/syncer.vue'); break
        case '#lyric': mod = import('../lyric-transfer/main.vue'); break
        case '': mod = import('../koharu-label/main.vue'); break
        default: location.hash = ''; return
      }
      mod = await mod
      const App = mod.default
      document.title = App.name
      this.current = App
    }
  },
  beforeMount() {
    this.handleHashchange()
    window.addEventListener('hashchange', this.handleHashchange)
  },
  beforeUnmount() {
    window.removeEventListener('hashchange', this.handleHashchange)
  },
  render() {
    const { current } = this
    if (current == null) { return null }
    const vnode = h(current, this.$attrs, this.$slots)
    vnode.ref = this.$.vnode.ref
    return vnode
  }
})