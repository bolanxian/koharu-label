
import { defineComponent } from "vue"
export default defineComponent({
  props: { promise: null },
  data() {
    return {
      status: 'pending' as 'pending' | 'default' | 'catch' | 'empty',
      value: void 0 as any,
      oldValue: void 0 as any
    }
  },
  watch: {
    promise: {
      handler(promise) {
        this.status = promise == null ? 'empty' : 'pending'
        this.oldValue = this.value
        this.value = void 0
        if (promise == null) { return }
        Promise.resolve(promise).then((val) => {
          if (this.promise !== promise) { return }
          this.status = val == null ? 'empty' : 'default'
          this.oldValue = this.value
          this.value = val
        }, (e) => {
          if (this.promise !== promise) { return }
          this.status = 'catch'
          this.oldValue = this.value
          this.value = e
        })
      }, immediate: true
    }
  },
  render() {
    const { value, oldValue, status } = this
    this.promise
    const fn = this.$slots[status]
    if (fn == null) { return null }
    return fn(value, oldValue)
  }
})