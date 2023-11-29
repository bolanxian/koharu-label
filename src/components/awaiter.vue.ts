
import { defineComponent, shallowRef as sr, watch } from 'vue'

export type AwaiterState = 'empty' | 'pending' | 'fulfilled' | 'rejected'
export const Awaiter = defineComponent({
  name: 'Awaiter',
  props: { promise: null },
  emits: ['settle', 'empty', 'pending', 'fulfilled', 'rejected'],
  setup(props, { slots, emit }) {
    const set = new WeakSet()
    const state = sr<AwaiterState>('empty'), value = sr()
    const settle = (_state: AwaiterState, _value: any) => {
      const oldState = state.value, oldValue = value.value
      state.value = _state; value.value = _value
      emit('settle', _state, _value, oldState, oldValue)
      emit(_state, _value)
    }
    const resolve = async (promise: any) => {
      let state: AwaiterState = 'pending', value
      settle(state, void 0)
      set.add(promise)
      try {
        value = await promise
        state = 'fulfilled'
      } catch (e) {
        value = e
        state = 'rejected'
      }
      if (props.promise === promise) { settle(state, value) }
      set.delete(promise)
    }
    watch(() => props.promise, (promise) => {
      if (promise == null) {
        settle('empty', promise)
        return
      }
      if (typeof promise !== 'object') {
        settle('fulfilled', promise)
        return
      }
      if (set.has(promise)) { return }
      resolve(promise)
    }, { immediate: true })
    return () => {
      const $state = state.value, $value = value.value
      let fn = slots[$state]
      if (fn != null) { return fn($value) }
      fn = slots.default
      return fn != null ? fn($state, $value) : null
    }
  }
})
