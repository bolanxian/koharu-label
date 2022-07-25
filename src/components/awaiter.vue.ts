
import * as Vue from "vue"
const { defineComponent, shallowRef: sr } = Vue
type State = 'empty' | 'pending' | 'fulfilled' | 'rejected'
export type AwaiterState = State
export const Awaiter = defineComponent({
  name: 'Awaiter',
  props: { promise: null },
  emits: { 'settle': null },
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
          this.settle('empty', void 0)
          return
        }
        this.settle('pending', void 0)
        Promise.resolve(promise).then((value) => {
          if (this.promise === promise) { this.settle('fulfilled', value) }
        }, (e) => {
          if (this.promise === promise) { this.settle('rejected', e) }
        })
      },
      immediate: true
    }
  },
  methods: {
    settle(_state: State, _value: any) {
      const { state, value } = this
      this.state = _state; this.value = _value
      this.$emit('settle', _state, _value, state, value)
    }
  },
  render() {
    const { state, value } = this
    let fn = this.$slots[state]
    if (fn != null) { return fn(value) }
    fn = this.$slots.default
    return fn != null ? fn(state, value) : null
  }
})
export default Awaiter