
import * as Vue from "vue"
const { defineComponent, shallowRef: sr } = Vue
type State = 'empty' | 'pending' | 'fulfilled' | 'rejected'
export type AwaiterState = State
export const Awaiter = defineComponent({
  name: 'Awaiter',
  props: { promise: null },
  emits: { 'update:value': null },
  setup() {
    return {
      state: sr<State>('empty'),
      value: sr()
    }
  },
  watch: {
    promise: {
      handler(promise) {
        if (promise == null) {
          this.state = 'empty'
          this.value = void 0
          return
        }
        this.state = 'pending'
        this.value = void 0
        Promise.resolve(promise).then((val) => {
          if (this.promise !== promise) { return }
          this.state = 'fulfilled'
          this.value = val
        }, (e) => {
          if (this.promise !== promise) { return }
          this.state = 'rejected'
          this.value = e
        })
      }, immediate: true
    },
    value(value, oldValue) {
      this.$emit('update:value', value, oldValue)
    }
  },
  render() {
    const { value, state } = this
    let fn = this.$slots[state]
    if (fn != null) { return fn(value) }
    fn = this.$slots.default
    return fn != null ? fn(state, value) : null
  }
})
export default Awaiter