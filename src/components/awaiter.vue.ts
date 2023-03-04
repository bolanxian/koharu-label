
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
      value: sr(),
      set: new WeakSet()
    }
  },
  watch: {
    promise: {
      handler(promise) {
        if (promise == null) {
          this.settle('empty', void 0)
          return
        }
        const { set, settle } = this
        if (set.has(promise)) { return }
        settle('pending', void 0)
        Promise.resolve(promise).then((value) => {
          if (this.promise === promise) { settle('fulfilled', value) }
        }, (e) => {
          if (this.promise === promise) { settle('rejected', e) }
        })
        set.add(promise)
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
    const { $slots, state, value } = this
    let fn = $slots[state]
    if (fn != null) { return fn(value) }
    fn = $slots.default
    return fn != null ? fn(state, value) : null
  }
})
export default Awaiter