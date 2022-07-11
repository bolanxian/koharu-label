import * as Vue from "vue";
const { defineComponent, createVNode: h, ref, shallowRef: sr } = Vue
import * as iview from "view-ui-plus"
const { Row, Col, Card, Icon, Input, Button, ButtonGroup, Checkbox } = iview
import DropFile from './drop-file.vue'
import * as utils from '../koharu-label/utils'
import { PyworldAll, PyWorld, AudioData, delay } from '../koharu-label/utils'
import { Ndarray, TypedArray, TypedArrayConstructor, TypeNdarray } from "../koharu-label/ndarray";
import * as vox from "../koharu-label/vox";
import { reactive } from "vue";
import { TypeOf } from "zod";


const utils2 = {
  *xparseLab(lab: string | string[], cb = (value: any) => { }): Generator<vox.LabLine> {
    const reg = /^\s*(\S+)\s+(\S+)\s+([\S\s]*?)\s*$/
    for (var line of typeof lab === 'string' ? lab.split(/\r?\n/) : lab) {
      line = line.trim()
      if (!line) { continue }
      if (line[0] === '#') {
        cb(line[0].slice(1))
        continue
      }
      var m = line.match(reg)
      if (m) {
        var [_, a, b, c] = m
        yield [+a / 10000, +b / 10000, c]
      }
    }
  },
  labelSync(
    lab0: string, lab1: string, f0: Float64Array, sp: Float64Array[], ap: Float64Array[], fs: number
  ): [Float64Array, TypeNdarray<2, 'float64'>, TypeNdarray<2, 'float64'>, number] {
    const shape = [f0.length, sp[0].length]
    const _sp = Ndarray.create('float64', shape) as TypeNdarray<2, 'float64'>
    const _ap = Ndarray.create('float64', shape) as TypeNdarray<2, 'float64'>
    _ap.buffer.fill(1 - 1e-16)
    const it = utils2.xparseLab(lab1), { trunc } = Math
    for (const [begin0, end0/*,lrc0*/] of utils2.xparseLab(lab0)) {
      const { done, value } = it.next()
      if (done) { break }
      const [begin1, end1/*,lrc1*/] = value
      const ratio = (end1 - begin1) / (end0 - begin0)
      for (let i = trunc(begin0 / 5), end = trunc(end0 / 5); i < end; i++) {
        const j = trunc((ratio * (i * 5 - begin0) + begin1) / 5)
        if (i >= _sp.length || j >= sp.length) { break }
        _sp[i].set(sp[j])
        _ap[i].set(ap[j])
      }
    }
    return [f0, _sp, _ap, fs]
  },
  typeSync(audio: AudioData, data: ArrayLike<number>) {
    const Ctor = audio.data.constructor as TypedArrayConstructor
    if (data.constructor !== Ctor) {
      const { max, min, trunc } = Math
      if (Ctor === Uint8Array) {
        data = Ctor.from(data, value => max(0, min(0xFF, trunc(value))))
      } else if (Ctor === Int16Array) {
        data = Ctor.from(data, value => max(-0x8000, min(0x7FFF, trunc(value))))
      }
    }
    return data
  },
  async standardizationVvproj(json: any) {
    if (typeof json === 'string' || json instanceof Blob) {
      json = await new Response(json).json()
    }
    for (const audioItem of Object.values(json.audioItems)) {
      for (const phrase of (audioItem as any).query.accentPhrases) {
        for (const mora of phrase.moras) {
          mora.pitch = 5.8
          mora.vowelLength = 0.15
        }
        const { pauseMora } = phrase
        if (typeof pauseMora === 'object' && pauseMora) {
          pauseMora.vowelLength = 0.15
        }
      }
    }
    return JSON.stringify(json)
  }
}
const createProcesser = <T extends {
  progress: string | null
  output: string | Promise<string> | null
}>(name: string, cb: (this: T, ...args: any[]) => any) => {
  return async function (this: T, ...args: any[]) {
    if (this.progress != null) { return }
    this.progress = name
    try {
      URL.revokeObjectURL(this.output as any)
      const blob = await (this.output = cb.apply(this, args))
      if (blob instanceof Blob) {
        this.output = URL.createObjectURL(blob)
      } else {
        this.output = null
      }
    } catch (e) {
      this.output = null
      iview.Message.error('合成失败')
      throw e
    } finally {
      this.progress = null
    }
  }
}
type Main = InstanceType<typeof Main>
export const Main = defineComponent({
  name: 'Koharu Label Syncer',
  props: {
    baseURL: { type: String, default: '/' },
    opts: { type: Object, default: () => ({}) }
  },
  setup(props, ctx) {
    const opts = {
      world: sr<PyWorld>(new PyWorld(props.baseURL)),
      f0File: sr<File | null>(null),
      audio: sr<File | AudioData | null>(null),
      worldResult: sr<PyworldAll | null>(null),
      progress: sr<string | null>(null),
      output: sr<string | Promise<string> | null>(null),
      imgs: sr<string[]>([]),

      lab0: ref<string>(''),
      lab1: ref<string>(''),
      useSavefig: ref(false)
    }
    ctx.expose(opts)
    return opts
  },
  beforeCreate() {
    this.$props.opts.value = this.$.exposed
  },
  computed: {
    outputAudioName() {
      const vm = this, { audio, output } = vm
      if (!(audio instanceof AudioData) || output instanceof Promise) { return null }
      return audio.name.replace(utils.EXT_REG, '_voxsyn.wav')
    }
  },
  methods: {
    async handleChange(files: File[]) {
      const { audioTypes } = AudioData
      var lab, f0, audio
      for (const file of files) {
        const type = utils.getFileExt(file)
        if (type === 'lab') { lab = file }
        else if (type === 'f0') { f0 = file }
        else if (type === 'vvproj') {
          utils.download([await utils2.standardizationVvproj(file)], file.name)
        }
        else if (audioTypes.has(type)) { audio = file }
      }
      if (lab) { this[audio != null ? 'lab1' : 'lab0'] = `#filename=${lab.name}\n${await lab.text()}` }
      if (f0) { this.f0File = f0 }
      if (audio) { await this.loadAudioFile(audio) }
    },
    closeF0File() { this.f0File = null },
    async loadAudioFile(file: File) {
      try {
        this.closeAudioFile()
        this.audio = file
        const audio = await this.world.decodeAudio(file)
        audio.name = file.name
        const result = await this.world.all(audio.data, audio.fs)
        this.audio = audio
        this.worldResult = result
      } catch (e) {
        this.closeAudioFile()
        iview.Message.error('导入失败')
        throw e
      }
      if (this.useSavefig) try {
        const { world, worldResult: audio, imgs } = this
        if (!audio) { return }
        for (const img of imgs.splice(0, imgs.length)) {
          URL.revokeObjectURL(img)
        }
        for (const args of [
          [[audio.f0]],
          [[audio.sp]],
          [[audio.ap], false]
        ] as [Ndarray[], boolean][]) {
          imgs.push(URL.createObjectURL(await world.savefig(...args)))
        }
      } catch (e) {
        console.warn(e)
      }
    },
    closeAudioFile() { this.audio = this.worldResult = this.output = null },
    async exportOriginAudio() {
      const { world, audio } = this
      if (!(audio instanceof AudioData)) { return }
      const { name, data, fs, info } = audio
      if (info == null) { return }
      const file = await world.encodeAudio(data, fs, info.format, info.subtype)
      utils.download([file], name)
    },
    handleSynthesize() { },
    handleSynthesizeTest() { },
    handleSynthesizeVox() { }
  },
  mounted() {
  },
  render() {
    const vm = this, { audio, output } = vm
    const audioData = audio instanceof AudioData ? audio : null
    const isSynthesizing = output instanceof Promise
    const realOutput = isSynthesizing ? '' : output
    return h(Row, { gutter: 5 }, () => [
      h(Col, { xs: 24, lg: 12 }, () => [
        h(DropFile, { global: !true, onChange: vm.handleChange }),
        h(Card, {
          icon: vm.f0File ? 'md-document' : '',
          title: vm.f0File ? vm.f0File.name : '需要 f0 文件'
        }, {
          extra: () => h(Button, {
            disabled: !vm.f0File,
            onClick: vm.closeF0File,
          }, () => h(Icon, { type: "md-close" }))
        }),
        h(Card, {
          icon: audioData ? 'md-document' : '',
          title: audio ? audioData ? audio.name : '加载中' : '需要 wav 文件'
        }, {
          default: () => audio instanceof AudioData ? audio.getInfo() : '',
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: !vm.audio,
              onClick: vm.exportOriginAudio
            }, () => '导出'),
            h(Button, {
              disabled: !vm.audio,
              onClick: vm.closeAudioFile
            }, () => h(Icon, { type: "md-close" }))
          ])
        }),
        h(Card, {
          icon: output ? 'md-document' : '',
          title: output ? isSynthesizing ? '合成中' : '已合成' : '合成'
        }, {
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: isSynthesizing || !(vm.f0File),
              onClick: vm.handleSynthesize,
            }, () => '合成')
            /*, h(Button, {
              disabled: isSynthesizing || !output,
              onClick: vm.handlePlay,
            }, () => h(Icon, { attrs: { type: "md-play" } }))*/
          ]),
          default: () => [
            realOutput ? h('audio', {
              controls: '', src: realOutput,
              style: { width: '100%' }
            }) : null,
            realOutput ? h('a', {
              href: realOutput, download: vm.outputAudioName
            }, vm.outputAudioName) : null
          ]
        }),
        Array.from(vm.imgs, src => h('img', { src }))
      ]),
      h(Col, { xs: 12, lg: 6 }, () => [
        h(Input, {
          type: "textarea",
          autosize: { minRows: 20, maxRows: 1 / 0 },
          modelValue: vm.lab0,
          'onUpdate:modelValue'(value: string) { vm.lab0 = value }
        })
      ]),
      h(Col, { xs: 12, lg: 6 }, () => [
        h(Input, {
          type: "textarea",
          autosize: { minRows: 20, maxRows: 1 / 0 },
          modelValue: vm.lab1,
          'onUpdate:modelValue'(value: string) { vm.lab1 = value }
        })
      ])
    ])
  }
})
export default Main
Object.assign(Main.methods as any, {
  handleSynthesize: createProcesser<Main>('', async function () {
    const vm = this
    const { world, f0File, audio, worldResult, lab0, lab1 } = vm
    if (!(audio instanceof AudioData && worldResult != null)) {
      setTimeout(vm.handleSynthesizeVox); return
    }
    const { fs, info } = audio, { sp, ap } = worldResult
    if (info == null || f0File == null) { return }
    const f0 = new Float64Array(await f0File.arrayBuffer())
    let result = await world.synthesize(...utils2.labelSync(lab0, lab1, f0, sp, ap, fs))
    //const adata=new AudioData(data,fs)
    return await world.encodeAudio(result, fs, info.format, info.subtype)
  }),
  handleSynthesizeTest: createProcesser<Main>('', async function () {
    const vm = this
    const { world, audio, worldResult } = vm
    if (!(audio instanceof AudioData && worldResult != null)) { return }
    const { fs, info } = audio, { f0, sp, ap } = worldResult
    if (info == null) { return }
    const result = await world.synthesize(f0, sp, ap, fs)
    //const adata=new AudioData(data,fs)
    return await world.encodeAudio(result, fs, info.format, info.subtype)
  }),
  handleSynthesizeVox: createProcesser<Main>('', async function () {
    const vm = this
    try {
      var speakers = await vox.getSpeakers()
    } catch (e) {
      iview.Message.error('连接 VOICEVOX ENGINE 失败')
      return
    }
    let msg: string | null = 'Input speaker id,min vowel length,max vowel length,pitch:\n' + speakers
    msg = prompt(msg, '8,0.05,0.15,5.8')
    if (msg == null) { return }
    let { world, lab0, f0File } = vm, [id, minVowelLength, maxVowelLength, pitch] = msg.split(',')
    if (f0File == null) { return }
    //lab0=vox.margeLab(lab0)
    const querys = vox.labToQuerys(lab0, {
      minVowelLength: +minVowelLength, maxVowelLength: +maxVowelLength, pitch: +pitch
    })
    let i, offset = 0, lab1 = '', datas = []
    let Ctor: TypedArrayConstructor = Float64Array, lastInfo = { format: '', subtype: '' }, lastFs = 24000
    for (i = 0; i < querys.length; i++) {
      const query = querys[i]
      iview.Message.info(`开始 VOICEVOX 合成 (${i + 1}/${querys.length})`)
      const file = await vox.synthesis(id, query)
      const { fs, info, data } = await world.decodeAudio(file)
      lab1 += vox.generateLab(query, offset).replace(/([^\n]+\n)$/, '#$1')
      offset += (data.length / fs) * 10000000
      datas.push(data)
      Ctor = data.constructor as TypedArrayConstructor
      lastInfo = info
      lastFs = fs
    }
    iview.Message.info('开始 WORLD 分析')
    const audio = new AudioData(new Ctor(await new Blob(datas).arrayBuffer()), lastFs)
    audio.name = f0File.name.replace(/\.f0$/, `(${msg}).wav`)
    audio.info = lastInfo
    const result = await world.all(audio.data, audio.fs)

    vm.lab0 = lab0//.map(l=>l.join(' ')).join('\n')
    vm.lab1 = lab1.replace(/#([^\n]+\n)$/, '$1')
    vm.audio = audio
    vm.worldResult = result

    iview.Message.info('开始 WORLD 合成')
    setTimeout(vm.handleSynthesize)
  })
})