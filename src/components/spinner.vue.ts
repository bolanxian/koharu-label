
import { defineComponent, createVNode as h, Transition } from 'vue'
import type { AwaiterState } from './awaiter.vue'

const baseClass = 'ivu-loading-bar', style = 'height:3px'
export const LoadingBar = defineComponent({
  props: {
    state: { type: String, default: 'empty' } as {
    } as { type: { new(): AwaiterState }, default: 'empty' }
  },
  setup(props) {
    let render, inner
    return () => h(Transition, { name: 'fade' }, render ??= () => {
      const { state } = props
      const rejected = state === 'rejected', loading = state === 'pending'
      return (loading || rejected) ? h('div', {
        class: `${baseClass} ${baseClass}--spinner`, style
      }, [
        h('div', {
          class: {
            [`${baseClass}-inner`]: true,
            [`${baseClass}-inner-color-primary`]: loading,
            [`${baseClass}-inner-failed-color-error`]: rejected
          },
          style
        }, loading ? inner ??= Array.from({ length: 5 }, (_, i) => {
          return h('div', {
            class: `${baseClass}-inner`,
            style: `${style};animation-delay:${-i}s`
          })
        }) : null)
      ]) : null
    })
  }
})

export const Spin = defineComponent({
  props: { show: { type: Boolean, default: true } },
  setup(props) {
    let render
    return () => h(Transition, { name: 'fade' }, render ??= () => [
      props.show ? h('div', { class: 'ivu-spin ivu-spin-fix' }, null) : null
    ])
  }
})