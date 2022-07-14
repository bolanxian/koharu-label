
import { defineComponent } from "vue"
type State = 'empty' | 'pending' | 'fulfilled' | 'rejected'
export default defineComponent({
  props: { promise: null },
  emits: { 'update:value': null },
  data() {
    return {
      state: 'empty' as State,
      value: void 0 as any
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
          this.state = val == null ? 'empty' : 'fulfilled'
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
    const fn = this.$slots[state]
    return fn != null ? fn(value) : null
  }
})