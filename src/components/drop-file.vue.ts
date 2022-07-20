
import * as Vue from "vue"
const { defineComponent, createVNode: h, shallowRef: sr, createCommentVNode } = Vue
const { isArray } = Array
export const DropGlobal = defineComponent({
  emits: {
    dragover: null,
    drop: null
  },
  methods: {
    handle(e: DragEvent) {
      this.$emit(e.type as any, e)
    }
  },
  beforeMount() {
    document.addEventListener('dragover', this.handle)
    document.addEventListener('drop', this.handle)
  },
  beforeUnmount() {
    document.removeEventListener('dragover', this.handle)
    document.removeEventListener('drop', this.handle)
  },
  render() {
    return createCommentVNode('global')
  }
})
export default defineComponent({
  name: 'DropFile',
  emits: { change(files: Array<File>) { return isArray(files) } },
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
      const file = this.file
      if (file == null) { return }
      file.click()
      e.stopPropagation()
    },
    handleChange(e: Event) {
      const file = this.file
      if (file == null) { return }
      const { files } = file
      if (files == null) { return }
      this.$emit('change', Array.from(files))
    },
    handleDragover(e: DragEvent | ClipboardEvent) {
      e.preventDefault(); e.stopPropagation()
    },
    handleDrop(e: DragEvent | ClipboardEvent) {
      const target = e.target as HTMLElement
      if (this.global && !this.$el.contains(target) && e.type !== 'paste') {
        const tag = target.tagName.toUpperCase()
        const able = target.getAttribute('contenteditable')
        if ('INPUT' === tag || 'TEXTAREA' === tag || '' === able || 'true' === able) return
      }
      e.preventDefault(); e.stopPropagation()
      const dT = 'dataTransfer' in e ? e.dataTransfer : e.clipboardData
      if (dT == null) return
      const { files } = dT
      if (files.length === 0) return
      this.$emit('change', Array.from(files))
    }
  },
  render() {
    const vm = this, slot = vm.$slots.default
    return h('div', {
      class: "ivu-upload ivu-upload-drag",
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
        type: "file", accept: vm.accept, multiple: vm.multiple,
        onChange: vm.handleChange
      }),
      h('textarea', {
        ref: 'textarea',
        style: {
          opacity: '0', position: 'absolute',
          width: '100%', height: '100%',
          cursor: 'pointer',
          top: '0', right: '0',
          bottom: '0', left: '0'
        },
        onCopy: vm.handleDragover,
        onPaste: vm.handleDrop
      }),
      slot != null ? slot() : [
        h('div', {
          class: "ivu-card-head",
          style: { 'text-align': 'left' }
        }, [
          h('p', {}, [
            h('i', {
              class: "ivu-icon ivu-icon-ios-folder-open",
              style: { "font-size": "20px" }
            }),
            `单击或拖动${vm.reason}文件到此${vm.global ? '页面' : '处'}`
          ])
        ]),
        h('div', { class: "ivu-card-body" })
      ]
    ])
  }
})