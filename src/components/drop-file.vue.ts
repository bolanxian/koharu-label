
import { defineComponent, createVNode as h, shallowRef as sr, createCommentVNode } from 'vue'
import { Icon } from 'view-ui-plus'
import { on, off } from '../utils'
const { isArray } = Array

export const DropGlobal = defineComponent({
  emits: {
    dragover: null,
    drop: null
  },
  methods: {
    handle(e: Event) {
      this.$emit(e.type as any, e as DragEvent)
    }
  },
  beforeMount() {
    on(document, 'dragover', this.handle)
    on(document, 'drop', this.handle)
  },
  beforeUnmount() {
    off(document, 'dragover', this.handle)
    off(document, 'drop', this.handle)
  },
  render() {
    return createCommentVNode('global')
  }
})
export default defineComponent({
  name: 'DropFile',
  emits: { change(files: File[]) { return isArray(files) } },
  props: {
    accept: { type: String, default: '' },
    global: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    multiple: { type: Boolean, default: true },
    paste: { type: Boolean, default: false }
  },
  setup(props, ctx) {
    const textarea = sr<HTMLTextAreaElement | null>(null)
    const file = sr<HTMLInputElement | null>(null)
    return {
      textarea, file
    }
  },
  methods: {
    handleClick(e: Event) {
      if (e.target !== this.file) {
        this.file!.click()
        e.preventDefault()
      }
      e.stopPropagation()
    },
    handleChange(e: Event) {
      const files = this.file!.files
      if (files?.length! > 0) {
        this.$emit('change', Array.from(files!))
      }
    },
    handleDragover(e: DragEvent | ClipboardEvent) {
      e.preventDefault(); e.stopPropagation()
    },
    handleDrop(e: (DragEvent | ClipboardEvent) & Partial<DragEvent & ClipboardEvent>) {
      const target = e.target as HTMLElement
      if (this.global && !this.$el.contains(target) && e.type !== 'paste') {
        const tag = target.tagName.toUpperCase()
        const able = target.getAttribute('contenteditable')
        if ('INPUT' === tag || 'TEXTAREA' === tag || '' === able || 'true' === able) return
      }
      e.preventDefault(); e.stopPropagation()
      const files = (e.dataTransfer ?? e.clipboardData)?.files
      if (files?.length! > 0) {
        this.$emit('change', Array.from(files!))
      }
    }
  },
  render() {
    const vm = this, slot = vm.$slots.default
    return h('div', {
      class: 'ivu-upload ivu-upload-drag',
      onDragover: vm.handleDragover,
      onDrop: vm.handleDrop,
      onClick: vm.handleClick
    }, [
      vm.global ? h(DropGlobal, {
        onDragover: vm.handleDragover,
        onDrop: vm.handleDrop
      }) : null,
      h('input', {
        ref: 'file',
        type: 'file', accept: vm.accept, multiple: vm.multiple,
        onChange: vm.handleChange
      }),
      h('textarea', {
        ref: 'textarea',
        style: {
          position: 'absolute',
          top: '0', left: '0',
          width: '100%', height: '100%',
          border: '0 none',
          resize: 'none',
          cursor: 'pointer',
          opacity: '0'
        },
        onCopy: vm.handleDragover,
        onPaste: vm.handleDrop
      }),
      slot != null ? slot() : [
        h('div', {
          class: 'ivu-card-head',
          style: { 'text-align': 'left' }
        }, [
          h('p', {}, [
            h(Icon, { type: 'ios-folder-open', size: 20 }),
            `单击或拖动${vm.reason}文件到此${vm.global ? '页面' : '处'}`
          ])
        ]),
        h('div', { class: 'ivu-card-body' })
      ]
    ])
  }
})