
import * as Vue from "vue"
const { defineComponent, createVNode: h, shallowRef: sr } = Vue
const { isArray } = Array
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
    handleDrop(e: DragEvent & ClipboardEvent) {
      const target = e.target as HTMLElement
      if (this.global && !this.$el.contains(target) && e.type !== 'paste') {
        const n = target.tagName.toUpperCase(),
          i = target.getAttribute('contenteditable')
        if ('INPUT' === n || 'TEXTAREA' === n || '' === i || 'true' === i) return
      }
      e.preventDefault(); e.stopPropagation()
      this.drop(e.dataTransfer ?? e.clipboardData)
    },
    drop(dT: DataTransfer | null) {
      if (!dT) return
      const { files } = dT
      if (files.length === 0) return
      this.$emit('change', Array.from(files))
    },
  },
  setup(props, ctx) {
    const textarea = sr<HTMLTextAreaElement | null>(null)
    const file = sr<HTMLInputElement | null>(null)
    return {
      textarea, file
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
      slot ? slot() : [
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