/**
 * @createDate 2021-12-9 14:59:59
*/
import { defineComponent, createVNode, shallowRef as sr } from "vue"
const h = createVNode
import { Message, Row, Col, Card, Icon, Input, Button, ButtonGroup, Radio, RadioGroup, Checkbox, Select, Option } from "view-ui-plus"
import readme from '../assets/readme.md?markdown'
import { romaji } from '../lyric-transfer/utils'
import '../components/app.vue'
import DropFile from '../components/drop-file.vue'
import { Awaiter, AwaiterState } from '../components/awaiter.vue'
import HelloWorld from '../components/hello-world.vue'
import * as utils from './utils'
import { AudioData } from './utils'
import { PyworldDio, PyWorld } from './pyworld'
import { WorldWasm, isSupport as isSupportWasm } from './world-wasm'
import SvpFile from './svp-file'

type World = PyWorld | WorldWasm | null
export default defineComponent({
  name: "Koharu Label",
  props: {
    backend: { type: String, default: '' },
    baseURL: { type: String, default: '/' }
  },
  data() {
    return {
      bpm: '120',
      basePitch: '60',
      phonemesRadio: 'null',
      refinePitch: false,
      useHarvest: false,
      envelope: false
    }
  },
  setup(props, ctx) {
    const msg = utils.assertByteorder('<')
    if (msg != null) {
      Message.error(msg)
      console.exception(msg)
    }
    const { backend } = props
    return {
      world: sr<World>(null),
      worldType: sr(backend !== 'python' ? 'World-Wasm' : 'PyWorld'),
      worldPromise: sr<Promise<World> | null>(null),
      handle: sr<FileSystemDirectoryHandle | null>(null),
      labFile: sr<File | null>(null),
      audio: sr<File | AudioData<boolean> | null>(null),
      worldResult: sr<PyworldDio | null>(null),
      inst: sr<SvpFile | null>(null)
    }
  },
  mounted() {
    this.$emit('mount:app', this)
  },
  watch: {
    worldType: {
      handler(worldType: string) {
        let promise: Promise<World> | null = null
        this.world = null
        if (worldType === 'World-Wasm(Async)') {
          promise = WorldWasm.create(!0)
        } else if (worldType === 'World-Wasm') {
          promise = WorldWasm.create(!1)
        } else if (worldType === 'PyWorld') {
          promise = Promise.resolve(new PyWorld(this.$props.baseURL))
        }
        this.worldPromise = promise
      }, immediate: true
    }
  },
  computed: {
    audioName(): string | undefined {
      const { audio, worldResult } = this
      if (audio != null && worldResult != null) {
        return audio.name.replace(utils.EXT_REG, '')
      }
    },
    audioMsg(): string {
      const { world, audio, worldResult } = this
      if (world == null) {
        if (this.worldPromise != null) { return `正在加载 ${this.worldType}` }
        return ''
      }
      if (audio != null) {
        if (audio instanceof AudioData) {
          return audio.getInfo()
        }
        if (worldResult == null) {
          return `使用 ${world.name} 导入音频文件 ${audio.name}`
        }
      }
      if (world instanceof PyWorld) {
        return `PyWorld: ${world.baseURL}`
      }
      return ''
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
          Message.warning('已取消')
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
        } else if (AudioData.audioTypes.has(type!)) {
          this.closeAudioFile()
          await this.loadAudioFile(file)
        }
      }
    },
    closeLabFile() {
      this.labFile = null
    },
    async loadAudioFile(file: File) {
      const { world } = this
      try {
        this.audio = file
        const audio = await world!.decodeAudio(file)
        audio.name = file.name
        const result = await world![this.useHarvest ? 'harvest' : 'dio'](audio.data, audio.fs)
        this.audio = audio
        this.worldResult = result
      } catch (e) {
        this.closeAudioFile()
        Message.error('导入失败')
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
      let sequence: Float64Array[]
      if (len > f0.byteLength) {
        len = (len - f0.byteLength) / Float64Array.BYTES_PER_ELEMENT
        sequence = [f0, new Float64Array(len).fill(f0.at(-1) ?? 0)]
      } else if (len < f0.byteLength) {
        sequence = [f0.subarray(0, len / Float64Array.BYTES_PER_ELEMENT)]
      } else {
        sequence = [f0]
      }
      console.log(zeroRanges, sequence)
      this.saveFile(sequence, audioName + '.f0')
    },
    async createSvpFile() {
      const vm = this, { labFile, audio, audioName, worldResult, phonemesRadio } = vm
      const inst = vm.inst = new SvpFile(+vm.bpm)
      inst.basePitch = +vm.basePitch
      if (worldResult != null) {
        const { f0, t } = worldResult
        inst.injectPitch(f0, t)
      }
      if (labFile != null) {
        inst.injectLab(await labFile.text())
      } else if (worldResult != null) {
        let dur = 176400000 * 2, len = inst.calcOffset(worldResult.t.at(-1) ?? 0)
        let beginIndex = 0, i, begin, end
        for (i = 0; i < len; i += dur) {
          [begin, end] = inst.findPitchRange(i, i + dur, beginIndex)
          if (begin >= end) { continue }
          beginIndex = begin
          inst.notes.push(SvpFile.createNote(i, dur, 'a', inst.basePitch))
        }
      }
      if (phonemesRadio !== 'null') {
        inst.margeConsonantNote()
        if (phonemesRadio !== 'marge') {
          let fn: (a: string) => string = String
          if (phonemesRadio === 'hiragana') { fn = romaji.toHiragana }
          else if (phonemesRadio === 'katakana') { fn = romaji.toKatakana }
          for (const note of inst.notes) {
            note.lyrics = fn(note.lyrics)
          }
        }
      }
      if (vm.refinePitch) { inst.refinePitch() }
      if (vm.envelope && audio instanceof AudioData) {
        const { data, fs } = audio
        inst.injectLoudnessWithEnvelope(data as ArrayLike<number>, fs)
      }
      return inst
    },
    async exportSvp() {
      const vm = this, { audioName } = vm
      const inst = await vm.createSvpFile()
      const svp = inst.toJSON(audioName)
      this.saveFile([JSON.stringify(svp), '\0'], audioName + '.svp')
    },
    async exportUstx() {
      const vm = this, { audioName } = vm
      const inst = await vm.createSvpFile()
      this.saveFile([inst.toUstx(audioName)], audioName + '.ustx')
    },
    async saveFile(sequence: BlobPart[], name: string) {
      const { handle } = this
      if (handle == null) {
        utils.download(sequence, name)
        return
      }
      await utils.saveFile(handle, sequence, name)
      Message.success('导出成功')
    }
  },
  render(/*ctx,cache,$props,$setup,$data,$options*/) {
    const vm = this
    return h(Row, { gutter: 5 }, () => [
      h(Col, { xs: 24, lg: 12 }, () => [
        h(DropFile, { global: true, onChange: vm.handleChange }),
        h(Card, {}, {
          title: () => {
            const name = vm.labFile?.name
            return h('p', {}, [
              name != null ? h('i', { class: "ivu-icon ivu-icon-md-document" }) : null,
              h('span', { title: name ?? '' }, [name ?? '需要 lab 文件'])
            ])
          },
          extra: () => h(Button, {
            disabled: vm.labFile == null,
            onClick: vm.closeLabFile,
          }, () => h(Icon, { type: "md-close" }))
        }),
        h(Card, {}, {
          title: () => {
            const name = vm.audio?.name
            return h('p', {}, [
              vm.audioName != null ? h('i', { class: "ivu-icon ivu-icon-md-document" }) : null,
              h('span', { title: name ?? '' }, [name ?? '需要 f0 文件'])
            ])
          },
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: !(vm.worldResult?.t[1] === 0.005),
              onClick: vm.exportF0
            }, () => '导出 f0'),
            h(Button, {
              disabled: vm.audioName == null,
              onClick: vm.closeAudioFile
            }, () => h(Icon, { type: "md-close" }))
          ]),
          default: () => h(Awaiter, {
            promise: vm.worldPromise,
            onFulfilled(world: World) { vm.world = world }
          }, (state: AwaiterState, world: World) => [
            h(Select, {
              style: 'width: 200px;display: block;margin-bottom: .8em',
              transfer: true,
              disabled: vm.audio != null,
              prefix: state !== 'pending' ? state !== 'rejected' ? '' : 'ios-close' : 'ios-loading',
              modelValue: vm.worldType,
              'onUpdate:modelValue'(value: string) { vm.worldType = value }
            }, () => [
              h(Option, { value: 'World-Wasm(Async)', disabled: !isSupportWasm }, () => 'World-Wasm(Async)'),
              h(Option, { value: 'World-Wasm', disabled: !isSupportWasm }, () => 'World-Wasm'),
              h(Option, { value: 'PyWorld' }, () => 'PyWorld')
            ]),
            vm.audioMsg
          ])
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
            }, () => 'svp'),
            h(Button, {
              disabled: vm.audioName == null && vm.labFile == null,
              onClick: vm.exportUstx
            }, () => 'ustx')
          ]),
          default: () => [
            h(Input, {
              modelValue: vm.bpm,
              'onUpdate:modelValue'(bpm: string) { vm.bpm = bpm }
            }, {
              prepend: () => h('span', {}, ['BPM:'])
            }),
            h(Input, {
              modelValue: vm.basePitch,
              'onUpdate:modelValue'(value: string) { vm.basePitch = value }
            }, {
              prepend: () => h('span', {}, ['基准音高:']),
              append: () => h(Checkbox, {
                modelValue: vm.refinePitch,
                'onUpdate:modelValue'(value: boolean) { vm.refinePitch = value }
              }, () => '细化音高')
            }),
            h(RadioGroup, {
              type: 'button',
              modelValue: vm.phonemesRadio,
              'onUpdate:modelValue'(value: string) { vm.phonemesRadio = value }
            }, () => [
              h(Radio, { label: 'null' }, () => '不转换'),
              h(Radio, { label: 'marge' }, () => '合并辅音'),
              h(Radio, { label: 'hiragana' }, () => '平假名'),
              h(Radio, { label: 'katakana' }, () => '片假名')
            ])
          ]
        })
      ]),
      h(Col, { xs: 24, lg: 12 }, () => [
        h(Card, {}, () => h("div", { innerHTML: readme })),
        import.meta.env.DEV ? h(HelloWorld) : null
      ])
    ])
  }
})