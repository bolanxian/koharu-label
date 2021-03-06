/**
 * @createDate 2022-2-26 16:41:35
*/
import * as Vue from "vue"
const { defineComponent, createVNode: h, ref, shallowRef: sr } = Vue
import * as iview from "view-ui-plus"
const { Row, Col, Card, Icon, Input, Button, ButtonGroup } = iview
import DropFile from '../components/drop-file.vue'
import Awaiter, { AwaiterState } from '../components/awaiter.vue'
import * as utils from './utils'
import { PyworldAll, PyWorld, AudioData } from './utils'
import { Ndarray, TypedArray, TypedArrayConstructor, TypeNdarray } from "./ndarray"
import * as vox from "./vox"
const utils2 = {
  *xparseLab(lab: string | string[], cb = (value: any) => { }): Generator<vox.LabLine> {
    const reg = /^\s*(\S+)\s+(\S+)\s+([\S\s]*?)\s*$/
    for (let line of typeof lab === 'string' ? lab.split(/\r?\n/) : lab) {
      line = line.trim()
      if (!line) { continue }
      if (line[0] === '#') {
        cb(line[0].slice(1))
        continue
      }
      const m = line.match(reg)
      if (m) {
        const [_, a, b, c] = m
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
const createProcesser = <
  T extends { process: string | null, output: Promise<string | null> | null }, A extends unknown[] = []
>(name: string, cb: (this: T, ...args: [...A]) => Promise<Blob | null | undefined>) => {
  return async function (this: T, ...args: [...A]) {
    if (this.process != null) { return }
    this.process = name
    try {
      const promise = this.output = cb.apply(this, args).then((data): string | null => {
        if (data instanceof Blob) { return URL.createObjectURL(data) }
        if (data === void 0) { this.output = null }
        return null
      })
      await promise
    } catch (e) {
      iview.Message.error('????????????')
      throw e
    } finally {
      this.process = null
    }
  }
}
const Main = defineComponent({
  name: 'Koharu Label Syncer',
  props: {
    baseURL: { type: String, default: '/' }
  },
  data() {
    return {
      process: null as string | null,
      output: null as Promise<string | null> | null,
      imgs: [] as string[],

      lab0: '',
      lab1: '',
      useSavefig: false,

      promptValue: null as string | null,
      info: ''
    }
  },
  setup(props, ctx) {
    return {
      world: sr<PyWorld>(new PyWorld(props.baseURL)),
      f0File: sr<File | null>(null),
      audio: sr<File | AudioData | null>(null),
      worldResult: sr<PyworldAll | null>(null)
    }
  },
  mounted() {
    this.$emit('mount:app', this)
  },
  computed: {
    outputAudioName() {
      const { audio } = this
      if (!(audio instanceof AudioData)) { return null }
      return audio.name.replace(utils.EXT_REG, '_voxsyn.wav')
    }
  },
  methods: {
    async handleChange(files: File[]) {
      const { audioTypes } = AudioData
      let lab, f0, audio
      for (const file of files) {
        const type = utils.getFileExt(file)
        if (type === 'lab') { lab = file }
        else if (type === 'f0') { f0 = file }
        else if (type === 'vvproj') {
          utils.download([await utils2.standardizationVvproj(file)], file.name)
        }
        else if (audioTypes.has(type)) { audio = file }
      }
      if (lab != null) { this[audio != null ? 'lab1' : 'lab0'] = `#filename=${lab.name}\n${await lab.text()}` }
      if (f0 != null) { this.f0File = f0 }
      if (audio != null) { await this.loadAudioFile(audio) }
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
        iview.Message.error('????????????')
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
    log(msg?: string | null) {
      if (msg == null) { this.info = ''; return }
      this.info = msg
      iview.Message.info(msg)
    },
    handleSynthesize() { },
    handleSynthesizeTest() { },
    handleSynthesizeVox() { }
  },
  render() {
    const vm = this
    return h(Row, { gutter: 5 }, () => [
      h(Col, { xs: 24, lg: 12 }, () => [
        h(DropFile, { global: true, onChange: vm.handleChange }),
        h(Card, {
          icon: vm.f0File != null ? 'md-document' : '',
          title: vm.f0File != null ? vm.f0File.name : '?????? f0 ??????'
        }, {
          extra: () => h(Button, {
            disabled: vm.f0File == null,
            onClick: vm.closeF0File,
          }, () => h(Icon, { type: "md-close" }))
        }),
        h(Card, {
          icon: vm.audio instanceof AudioData ? 'md-document' : '',
          title: vm.audio != null ? vm.audio instanceof AudioData ? vm.audio.name : '?????????' : '?????? wav ??????'
        }, {
          default: () => vm.audio instanceof AudioData ? vm.audio.getInfo() : '',
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: vm.audio == null,
              onClick: vm.exportOriginAudio
            }, () => '??????'),
            h(Button, {
              disabled: vm.audio == null,
              onClick: vm.closeAudioFile
            }, () => h(Icon, { type: "md-close" }))
          ])
        }),
        h(Awaiter, {
          promise: vm.output,
          'onUpdate:value'(value: any, oldValue: any) {
            if (typeof oldValue === 'string') { URL.revokeObjectURL(oldValue) }
          }
        }, (state: AwaiterState, output: any) => {
          if (state === 'fulfilled' && output == null) { state = 'pending' }
          const fulfilled = state === 'fulfilled', rejected = state === 'rejected'
          const loading = state === 'pending', empty = state === 'empty'
          return h(Card, {}, {
            title: () => h('p', {}, [h('span', {}, [
              fulfilled ? h(Icon, { type: "md-document" }) : null,
              fulfilled ? h('a', { href: output, download: vm.outputAudioName }, vm.outputAudioName) : null,
              rejected ? '????????????' : null,
              loading ? '?????????' : null,
              empty ? '??????' : null
            ])]),
            extra: () => h(Button, {
              loading, disabled: vm.f0File == null, onClick: vm.handleSynthesize
            }, () => '??????'),
            default: () => [
              fulfilled ? h('audio', { controls: '', src: output, style: { width: '100%' } }) : null,
              loading ? h('div', {}, vm.info) : null
            ]
          })
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
export default (Main)
type Main = InstanceType<typeof Main>
Object.assign(Main.methods as any, {
  handleSynthesize: createProcesser('', async function (this: Main) {
    const vm = this, { world, f0File, audio, worldResult, lab0, lab1 } = vm
    if (!(audio instanceof AudioData && worldResult != null)) {
      setTimeout(vm.handleSynthesizeVox); return null
    }
    const { fs, info } = audio, { sp, ap } = worldResult
    if (info == null || f0File == null) { return }
    vm.log('?????? WORLD ??????')
    const f0 = new Float64Array(await f0File.arrayBuffer())
    const result = await world.synthesize(...utils2.labelSync(lab0, lab1, f0, sp, ap, fs))
    return await world.encodeAudio(result, fs, info.format, info.subtype)
  }),
  handleSynthesizeTest: createProcesser('', async function (this: Main) {
    const vm = this, { world, audio, worldResult } = vm
    if (!(audio instanceof AudioData && worldResult != null)) { return }
    const { fs, info } = audio, { f0, sp, ap } = worldResult
    if (info == null) { return }
    const result = await world.synthesize(f0, sp, ap, fs)
    return await world.encodeAudio(result, fs, info.format, info.subtype)
  }),
  handleSynthesizeVox: createProcesser('', async function (this: Main) {
    const vm = this, { world, lab0, f0File } = vm
    let { promptValue } = vm
    if (f0File == null) { return }
    vm.log()
    try {
      let speakers = await vox.getSpeakers()
      var msg = 'Input speaker id,min vowel length,max vowel length,pitch:\n' + speakers
    } catch (e) {
      iview.Message.error('?????? VOICEVOX ENGINE ??????')
      return
    }
    if (promptValue == null) { promptValue = '8,0.05,0.15,5.8' }
    promptValue = prompt(msg, promptValue)
    if (promptValue == null) { return }
    vm.promptValue = promptValue
    const [id, minVowelLength, maxVowelLength, pitch] = promptValue.split(',')
    //lab0=vox.margeLab(lab0)
    const querys = vox.labToQuerys(lab0, {
      minVowelLength: +minVowelLength, maxVowelLength: +maxVowelLength, pitch: +pitch
    })
    let i, offset = 0, lab1 = '', datas = []
    let Ctor: TypedArrayConstructor = Float64Array, lastInfo = { format: '', subtype: '' }, lastFs = 24000
    for (i = 0; i < querys.length; i++) {
      const query = querys[i]
      vm.log(`?????? VOICEVOX ?????? (${i + 1}/${querys.length})`)
      const file = await vox.synthesis(id, query)
      const { fs, info, data } = await world.decodeAudio(file)
      lab1 += vox.generateLab(query, offset).replace(/([^\n]+\n)$/, '#$1')
      offset += (data.length / fs) * 10000000
      datas.push(data)
      Ctor = data.constructor as TypedArrayConstructor
      lastInfo = info
      lastFs = fs
    }
    vm.log('?????? WORLD ??????')
    const audio = new AudioData(new Ctor(await new Blob(datas).arrayBuffer()), lastFs)
    audio.name = f0File.name.replace(/\.f0$/, `(${promptValue}).wav`)
    audio.info = lastInfo
    const result = await world.all(audio.data, audio.fs)

    vm.lab0 = lab0//.map(l=>l.join(' ')).join('\n')
    vm.lab1 = lab1.replace(/#([^\n]+\n)$/, '$1')
    vm.audio = audio
    vm.worldResult = result
    vm.log()
    setTimeout(vm.handleSynthesize)
    return null
  })
})