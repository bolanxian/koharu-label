/**
 * @createDate 2021-12-9 14:59:59
*/
import * as Vue from "vue"
const { defineComponent, createVNode: h, ref, shallowRef: sr } = Vue
import * as iview from "view-ui-plus"
const { Row, Col, Card, Icon, Input, Button, ButtonGroup, Checkbox } = iview
import { marked } from 'marked'
import DropFile from '../components/drop-file.vue'
import HelloWorld from '../components/hello-world.vue'
import * as utils from './utils'
import { PyworldDio, PyWorld, AudioData } from './utils'
import SvpFile from './svp-file'
import readme from '../assets/readme.md?raw'
const info = marked.parse(readme).replace(/\<a ([^>]*)\>/g, '<a target="_blank" $1>')
export default defineComponent({
  name: "Koharu Label",
  props: {
    baseURL: { type: String, default: '/' }
  },
  data() {
    return {
      bpm: '120',
      basePitch: '60',
      margeConsonant: false,
      refinePitch: false,
      useHarvest: false,
      envelope: false
    }
  },
  setup(props, ctx) {
    const msg = utils.assertByteorder('<')
    if (msg != null) {
      iview.Message.error(msg)
      console.exception(msg)
    }
    return {
      world: sr<PyWorld>(new PyWorld(props.baseURL)),
      handle: sr<FileSystemDirectoryHandle | null>(null),
      labFile: sr<File | null>(null),
      audio: sr<File | AudioData | null>(null),
      worldResult: sr<PyworldDio | null>(null),
      inst: sr<SvpFile | null>(null)
    }
  },
  mounted() {
    this.$emit('mount:app', this)
  },
  computed: {
    audioName(): string | void {
      const { audio, worldResult } = this
      if (audio != null && worldResult != null) {
        return audio.name.replace(utils.EXT_REG, '')
      }
    },
    audioMsg(): string {
      const { world, audio, worldResult } = this
      if (audio) {
        if (audio instanceof AudioData) {
          return audio.getInfo()
        } else if (worldResult != null) {
          return ''
        } else {
          return `使用 ${world.name} 导入音频文件 ${audio.name}`
        }
      } else {
        return `PyWorld:${world.baseURL}`
      }
    }
  },
  methods: {
    async openDir() {
      try {
        const handle = await window.showDirectoryPicker()
        if (await utils.fileSystemHandleVerifyPermission(handle, true)) {
          this.handle = handle
        }
      } catch (e) {
        if (!(e instanceof Error)) { throw e }
        if (e.name === 'AbortError') {
          iview.Message.warning('选择了取消')
          this.handle = null
        } else { throw e }
      }
    },
    async handleChange(files: File[]) {
      for (const file of files) {
        const type = utils.getFileExt(file)
        if (type === 'lab') {
          this.labFile = file
        } else if (type === 'f0') {
          this.closeAudioFile()
          await this.loadF0File(file)
        } else if (AudioData.audioTypes.has(type)) {
          this.closeAudioFile()
          await this.loadAudioFile(file)
        }
      }
    },
    closeLabFile() {
      this.labFile = null
    },
    async loadAudioFile(file: File) {
      try {
        this.audio = file
        const audio = await this.world.decodeAudio(file)
        audio.name = file.name
        const result = await this.world[this.useHarvest ? 'harvest' : 'dio'](audio.data, audio.fs)
        this.audio = audio
        this.worldResult = result
      } catch (e) {
        this.closeAudioFile()
        iview.Message.error('导入失败')
        throw e
      }
    },
    closeAudioFile() {
      this.audio = this.worldResult = null
    },
    async loadF0File(file: File) {
      const f0 = new Float64Array(await file.arrayBuffer())
      const result = {
        f0, t: Float64Array.from(f0, (_, i) => i / 200)
      }
      this.audio = file
      this.worldResult = result
    },
    async exportF0() {
      const { audioName, worldResult } = this
      if (audioName == null || worldResult == null) { return }
      let _len = prompt('填充长度（字节）')
      if (typeof _len !== 'string') { return }
      _len = _len.replace(/[\s,]/g, '')
      if (!_len) {
        this.saveFile([worldResult.f0], audioName + '.f0')
        return
      }
      let len = parseInt(_len)
      if (len !== len) { return }
      let { f0 } = worldResult
      f0 = (f0.constructor as Float64ArrayConstructor).from(f0)
      const zeroRanges = utils.getZeroRanges(f0)
      {
        const first = zeroRanges[0]
        if (first != null && first[0] === 0) {
          zeroRanges.shift()
          const end = first[1]
          f0.fill(f0[end], 0, end)
        }
        const last = zeroRanges.at(-1)
        if (last != null && last[1] === f0.length) {
          zeroRanges.pop()
          const begin = last[0]
          f0.fill(f0[begin - 1], begin)
        }
      }
      for (const [begin, end] of zeroRanges) {
        const left = f0[begin - 1], right = f0[end]
        const ratio = (right - left) / (1 + end - begin)
        for (let i = begin, j = 1; i < end; i++, j++) {
          f0[i] = left + ratio * j
        }
      }
      const sequence = [f0]
      if (len > f0.byteLength) {
        len = (len - f0.byteLength) / Float64Array.BYTES_PER_ELEMENT
        sequence.push(new Float64Array(len).fill(f0.at(-1) ?? 0))
      }
      console.log(zeroRanges, sequence)
      this.saveFile(sequence, audioName + '.f0')
    },
    async exportSvp() {
      const vm = this, { labFile, audio, audioName, worldResult } = vm
      const inst = vm.inst = new SvpFile(+vm.bpm)
      inst.basePitch = +vm.basePitch
      if (worldResult != null) {
        const { f0, t } = worldResult
        inst.injectPitch(f0, t)
      }
      if (labFile != null) {
        inst.injectLab(await labFile.text())
      } else if (worldResult != null) {
        const dur = 176400000 * 2, len = inst.calcOffset(worldResult.t.at(-1) ?? 0)
        let beginIndex = 0, i, begin, end
        for (i = 0; i < len; i += dur) {
          [begin, end] = inst.findPitchRange(i, i + dur, beginIndex)
          if (begin >= end) { continue }
          beginIndex = begin
          inst.notes.push(SvpFile.createNote(i, dur, 'a', inst.basePitch))
        }
      }
      if (vm.margeConsonant) { inst.margeConsonantNote() }
      if (vm.refinePitch) { inst.refinePitch() }
      if (vm.envelope && audio instanceof AudioData) {
        const { data, fs } = audio
        inst.injectLoudnessWithEnvelope(data as ArrayLike<number>, fs)
      }
      const svp = inst.toJSON()
      if (audioName != null) { svp.library[0].name = audioName }
      vm.saveFile([JSON.stringify(svp), '\0'], audioName + '.svp')
    },
    async saveFile(sequence: BlobPart[], name: string) {
      const { handle } = this
      if (handle == null) {
        utils.download(sequence, name)
        return
      }
      await utils.saveFile(handle, sequence, name)
      iview.Message.success('导出成功')
    }
  },
  render(/*ctx,cache,$props,$setup,$data,$options*/) {
    const vm = this
    return h(Row, { gutter: 5 }, () => [
      h(Col, { xs: 24, lg: 12 }, () => [
        h(DropFile, { global: true, onChange: vm.handleChange }),
        h(Card, {
          icon: vm.labFile != null ? 'md-document' : '',
          title: vm.labFile != null ? vm.labFile.name : '需要 lab 文件'
        }, {
          extra: () => h(Button, {
            disabled: vm.labFile == null,
            onClick: vm.closeLabFile,
          }, () => h(Icon, { type: "md-close" }))
        }),
        h(Card, {
          icon: vm.audioName != null ? 'md-document' : '',
          title: vm.audio != null ? vm.audio.name : '需要 f0 文件'
        }, {
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: !(vm.worldResult && vm.worldResult.t[1] === 0.005),
              onClick: vm.exportF0
            }, () => '导出 f0'),
            h(Button, {
              disabled: vm.audioName == null,
              onClick: vm.closeAudioFile
            }, () => h(Icon, { type: "md-close" }))
          ]),
          default: () => vm.audioMsg
        }),
        h(Card, {
          icon: vm.audioName != null ? 'md-document' : '',
          title: vm.handle != null ? `导出到 ${vm.handle.name}` : '导出'
        }, {
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: typeof window.showDirectoryPicker !== 'function',
              onClick: vm.openDir
            }, () => '打开文件夹'),
            h(Button, {
              disabled: vm.audioName == null && vm.labFile == null,
              onClick: vm.exportSvp
            }, () => 'svp')
          ]),
          default: () => [
            h(Input, {
              modelValue: vm.bpm,
              'onUpdate:modelValue'(bpm: string) { vm.bpm = bpm }
            }, {
              prepend: () => h('span', {}, 'BPM:'),
              append: () => h(Checkbox, {
                modelValue: vm.margeConsonant,
                'onUpdate:modelValue'(value: boolean) { vm.margeConsonant = value }
              }, () => '合并辅音')
            }),
            h(Input, {
              modelValue: vm.basePitch,
              'onUpdate:modelValue'(value: string) { vm.basePitch = value }
            }, {
              prepend: () => h('span', {}, '基准音高:'),
              append: () => h(Checkbox, {
                modelValue: vm.refinePitch,
                'onUpdate:modelValue'(value: boolean) { vm.refinePitch = value }
              }, () => '细化音高')
            })
          ]
        })
      ]),
      h(Col, { xs: 24, lg: 12 }, () => [
        h(Card, {}, () => h("div", { innerHTML: info })),
        import.meta.env.DEV ? h(HelloWorld) : null
      ])
    ])
  }
})