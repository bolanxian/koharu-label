/**
 * @createDate 2022-2-26 16:41:35
*/
import { defineComponent, createVNode as h, shallowRef as sr } from 'vue'
import { Message, Row, Col, Card, Icon, Input, Button, ButtonGroup, Select, Option } from 'view-ui-plus'

import { EXT_REG, getFileExt, download } from '../utils'
import DropFile from '../components/drop-file.vue'
import { Awaiter, AwaiterState } from '../components/awaiter.vue'
import * as utils from './utils'
import { AudioData } from './utils'
import type { TypeNdarray, TypedArray, TypedArrayConstructor } from './ndarray'
import { Ndarray } from './ndarray'
import { PyworldAll, PyWorld } from './pyworld'
import { WorldWasm, isSupport as isSupportWasm } from './world-wasm'
import IterableStream from './iterator-stream'
import * as vox from './vox-legacy'

type World = PyWorld | WorldWasm | null
const { apply } = Reflect
const M = utils.localer((locale) => {
  switch (locale) {
    case 'zh-CN': case 'zh-Hans': return {
      loading: '加载中',
      world_syn: '开始 WORLD 合成',
      vox_syn: '开始 VOICEVOX 合成',
      conn_vox_fail: '连接 VOICEVOX ENGINE 失败',
      world_analysis: '开始 WORLD 分析',
      syn_input: '输入\u3000角色ID，最小元音长度，最大元音长度，音高：',
      syn_fail: '合成失败',
      syn_pend: '合成中',
      syn_v: '合成',
      syn: '合成',
      export: '导出',
      version_: '版本：',
      refresh: '刷新',
      set_cors0: '可能需要前往 ',
      set_cors1: ' 设置CORS'
    }
    case 'en-US': case 'en': return {
      loading: 'Loading',
      world_syn: 'Start WORLD synthesis',
      vox_syn: 'Start VOICEVOX synthesis',
      conn_vox_fail: 'Connect VOICEVOX ENGINE failed',
      world_analysis: 'Start WORLD analysis',
      syn_input: 'Input speaker id,min vowel length,max vowel length,pitch:',
      syn_fail: 'Synthesis failed',
      syn_pend: 'In synthesis',
      syn_v: 'Synthesize',
      syn: 'Synthesis',
      export: 'export',
      version_: 'Version: ',
      refresh: 'Refresh',
      set_cors0: 'You may need to go to ',
      set_cors1: ' to set CORS'
    }
  }
}, '')
const T = utils.localer<{
  require: (type: string) => string
}, () => ''>((locale) => {
  switch (locale) {
    case 'zh-CN': case 'zh-Hans': return {
      require: (type) => `需要 ${type} 文件`
    }
    case 'en-US': case 'en': return {
      require: (type) => `Require ${type} file`
    }
  }
}, () => '')
const utils2 = {
  normalizeLab(lab: string | string[]) {
    const reg = /^(pau|sil)$/
    let prevLrc = '', prevLine = ''
    let result = ''
    for (const [a, b, lrc] of vox.xparseLab(lab)) {
      if (reg.test(prevLrc) && reg.test(lrc)) { result += '#' }
      result += prevLine
      prevLine = `${a} ${b} ${lrc}\n`
      prevLrc = lrc
    }
    result += prevLine
    return result
  },
  *xparseLab(lab: string | string[]): Generator<vox.LabLine> {
    for (const [a, b, lrc] of vox.xparseLab(lab)) {
      yield [a / 10000, b / 10000, lrc]
    }
  },
  labelSync(
    lab0: string, lab1: string, f0: TypedArray<'float64'>, sp: Float64Array[], ap: Float64Array[], fs: number
  ): [TypedArray<'float64'>, TypeNdarray<2, 'float64'>, TypeNdarray<2, 'float64'>, number] {
    const shape: [number, number] = [f0.length, sp[0].length]
    const _sp = Ndarray.create('float64', shape)
    const _ap = Ndarray.create('float64', shape)
    _sp.buffer.fill(1e-16)
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
  async normalizeVvproj(json: any) {
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
>(name: string, cb: (this: T, ...args: [...A]) => Promise<Blob | Function | undefined>) => {
  return async function (this: T, ...args: [...A]) {
    if (this.process != null) { return }
    this.process = name
    try {
      const promise = this.output = apply(cb, this, args).then((data): string | null => {
        if (data instanceof Blob) { return URL.createObjectURL(data) }
        if (typeof data === 'function') { setTimeout(data); return null }
        return this.output = null
      })
      await promise
    } catch (e) {
      Message.error(M('syn_fail'))
      throw e
    } finally {
      this.process = null
    }
  }
}
const getVoxInfo = async () => {
  const info = await vox.getInfo()
  const speakers = await vox.getSpeakers()
  return { ...info, speakers }
}
const Main = defineComponent({
  name: 'Koharu Label Syncer (Legacy)',
  props: {
    backend: { type: String, default: '' },
    baseURL: { type: String, default: '/' }
  },
  data() {
    return {
      voxInfo: getVoxInfo(),
      process: null as string | null,
      output: null as Promise<string | null> | null,
      outputState: 'empty' as AwaiterState,
      imgs: [] as string[],

      lab0: '',
      lab1: '',
      useSavefig: false,

      promptValue: null as string | null,
      info: ''
    }
  },
  setup(props, ctx) {
    const { backend } = props
    return {
      world: sr<World>(null),
      worldType: sr(backend !== 'python' ? 'World-Wasm' : 'PyWorld'),
      worldPromise: sr<Promise<World> | null>(null),
      f0File: sr<File | null>(null),
      audio: sr<File | AudioData | null>(null),
      worldResult: sr<PyworldAll | null>(null)
    }
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
    outputAudioName() {
      const { audio } = this
      if (!(audio instanceof AudioData)) { return null }
      return audio.name.replace(EXT_REG, '_voxsyn.wav')
    }
  },
  methods: {
    getVoxInfo() { this.voxInfo = getVoxInfo() },
    setVoxBaseURL() {
      let url = prompt('VOICEVOX Engine URL:', vox.baseURL)
      if (url == null) { return }
      vox.setBaseURL(url === '' ? void 0 : url)
      this.getVoxInfo()
    },
    async handleChange(files: File[]) {
      const { audioTypes } = AudioData
      let lab, f0, audio
      for (const file of files) {
        const type = getFileExt(file)
        if (type === 'lab') { lab = file }
        else if (type === 'f0') { f0 = file }
        else if (type === 'vvproj') {
          download([await utils2.normalizeVvproj(file)], file.name)
          return
        } else if (audioTypes.has(type!)) { audio = file }
      }
      if (lab != null) {
        let text = await lab.text()
        text = audio != null ? text : utils2.normalizeLab(text)
        this[audio != null ? 'lab1' : 'lab0'] = `#filename=${lab.name}\n${text}`
      }
      if (f0 != null) { this.f0File = f0 }
      if (audio != null) { await this.loadAudioFile(audio) }
    },
    closeF0File() { this.f0File = null },
    async loadAudioFile(file: File) {
      const { world } = this
      try {
        this.closeAudioFile()
        this.audio = file
        const audio = await world!.decodeAudio(file)
        audio.name = file.name
        const result = await world!.all(audio.data, audio.fs)
        this.audio = audio
        this.worldResult = result
      } catch (e) {
        this.closeAudioFile()
        Message.error('导入失败')
        throw e
      }
      if (this.useSavefig && world instanceof PyWorld) try {
        const { worldResult: audio, imgs } = this
        if (audio == null) { return }
        for (const img of imgs) {
          URL.revokeObjectURL(img)
        }
        imgs.length = 0
        const argss: [(TypedArray | Ndarray)[], boolean?][] = [
          [[audio.f0]],
          [[audio.sp]],
          [[audio.ap], false]
        ]
        for (let i = 0; i < argss.length; i++) {
          imgs[i] = URL.createObjectURL(await world.savefig(...argss[i]))
        }
      } catch (e) {
        console.warn(e)
      }
    },
    closeAudioFile() { this.audio = this.worldResult = this.output = null },
    async exportOriginAudio() {
      const { world, audio } = this
      if (!(world != null && audio instanceof AudioData)) { return }
      const { name, data, fs, info } = audio
      const file = await world.encodeAudio(data, fs, info?.format, info?.subtype)
      download([file], name)
    },
    log(msg?: string | null) {
      if (msg == null) { this.info = ''; return }
      this.info = msg
      Message.info(msg)
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
          title: vm.f0File?.name ?? T('require')('f0')
        }, {
          extra: () => h(Button, {
            disabled: vm.f0File == null,
            onClick: vm.closeF0File,
          }, () => h(Icon, { type: 'md-close' }))
        }),
        h(Card, {
          icon: vm.audio instanceof AudioData ? 'md-document' : '',
          title: vm.audio != null ? vm.audio instanceof AudioData ? vm.audio.name : M('loading') : T('require')('wav')
        }, {
          extra: () => h(ButtonGroup, {}, () => [
            h(Button, {
              disabled: !(vm.audio instanceof AudioData),
              onClick: vm.exportOriginAudio
            }, () => M('export')),
            h(Button, {
              disabled: !(vm.audio instanceof AudioData),
              onClick: vm.closeAudioFile
            }, () => h(Icon, { type: 'md-close' }))
          ]),
          default: () => h(Awaiter, {
            promise: vm.worldPromise,
            onFulfilled(world: World) { vm.world = world }
          }, (state: AwaiterState, world: World) => [
            h(Select, {
              style: 'width: 200px;display: block;margin-bottom: .8em',
              transfer: true,
              disabled: vm.audio != null || vm.outputState === 'pending',
              prefix: state !== 'pending' ? state !== 'rejected' ? '' : 'ios-close' : 'ios-loading',
              modelValue: vm.worldType,
              'onUpdate:modelValue'(value: string) { vm.worldType = value }
            }, () => [
              h(Option, { value: 'World-Wasm(Async)', disabled: !isSupportWasm }, () => 'World-Wasm(Async)'),
              h(Option, { value: 'World-Wasm', disabled: !isSupportWasm }, () => 'World-Wasm'),
              h(Option, { value: 'PyWorld' }, () => 'PyWorld')
            ]),
            vm.audio instanceof AudioData ? vm.audio.getInfo() : ''
          ])
        }),
        h(Awaiter, {
          promise: vm.output,
          onSettle(state: AwaiterState, value: Awaited<typeof vm["output"]>, _state: typeof state, _value: typeof value) {
            vm.outputState = state
            if (_state === 'fulfilled' && typeof _value === 'string') { URL.revokeObjectURL(_value) }
          }
        }, (state: AwaiterState, output: Awaited<typeof vm["output"]>) => {
          if (state === 'fulfilled' && output == null) { state = 'pending' }
          const fulfilled = state === 'fulfilled', rejected = state === 'rejected'
          const loading = state === 'pending', empty = state === 'empty'
          return h(Card, {}, {
            title: () => h('p', {}, [h('span', {}, [
              fulfilled ? h(Icon, { type: 'md-document' }) : null,
              fulfilled ? h('a', { href: output, download: vm.outputAudioName }, vm.outputAudioName) : null,
              rejected ? M('syn_fail') : null,
              loading ? M('syn_pend') : null,
              empty ? M('syn') : null
            ])]),
            extra: () => h(Button, {
              loading, disabled: vm.f0File == null, onClick: vm.handleSynthesize
            }, () => M('syn_v')),
            default: () => [
              fulfilled ? h('audio', { controls: '', src: output, style: { width: '100%' } }) : null,
              loading ? h('div', {}, [vm.info]) : null
            ]
          })
        }),
        h(Awaiter, {
          promise: vm.voxInfo,
        }, (state: AwaiterState, info: Awaited<typeof vm["voxInfo"]>) => {
          const fulfilled = state === 'fulfilled', rejected = state === 'rejected'
          const loading = state === 'pending', empty = state === 'empty'
          return h(Card, {}, {
            title: () => [
              h('p', {}, [h('span', {}, [fulfilled ? info.brand_name : 'VOICEVOX'])]),
              fulfilled ? h('div', { class: 'ivu-cell-label' }, [info.name]) : null,
              fulfilled ? h('div', { class: 'ivu-cell-label' }, [`${M('version_')}${info.version}`]) : null
            ],
            extra: () => h(ButtonGroup, {}, () => [
              h(Button, { loading, onClick: vm.setVoxBaseURL }, () => 'URL'),
              h(Button, { disabled: loading, onClick: vm.getVoxInfo }, () => M('refresh'))
            ]),
            default: () => {
              if (fulfilled) { return [h('pre', { innerText: info.speakers })] }
              if (rejected) {
                const href = vox.getSettingURL()
                return [
                  M('conn_vox_fail'), h('br'),
                  M('set_cors0'), h('a', { target: '_blank', href }, [href]), M('set_cors1')
                ]
              }
            }
          })
        }),
        Array.from(vm.imgs, src => h('img', { src }))
      ]),
      h(Col, { xs: 12, lg: 6 }, () => [
        h(Input, {
          type: 'textarea',
          autosize: { minRows: 20, maxRows: 1 / 0 },
          modelValue: vm.lab0,
          'onUpdate:modelValue'(value: string) { vm.lab0 = value }
        })
      ]),
      h(Col, { xs: 12, lg: 6 }, () => [
        h(Input, {
          type: 'textarea',
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
    if (world == null || f0File == null) { return }
    if (!(audio instanceof AudioData && worldResult != null)) {
      return vm.handleSynthesizeVox
    }
    const { fs, info } = audio, { sp, ap } = worldResult
    vm.log(M('world_syn'))
    const f0 = new Float64Array(await f0File.arrayBuffer())
    const result = await world.synthesize(...utils2.labelSync(lab0, lab1, f0, sp, ap, fs))
    return await world.encodeAudio(result, fs, info?.format, info?.subtype)
  }),
  handleSynthesizeTest: createProcesser('', async function (this: Main) {
    const vm = this, { world, audio, worldResult } = vm
    if (world == null) { return }
    if (!(audio instanceof AudioData && worldResult != null)) { return }
    const { fs, info } = audio, { f0, sp, ap } = worldResult
    const result = await world.synthesize(f0, sp, ap, fs)
    return await world.encodeAudio(result, fs, info?.format, info?.subtype)
  }),
  handleSynthesizeVox: createProcesser('', async function (this: Main) {
    const vm = this, { world, lab0, f0File } = vm
    if (world == null || f0File == null) { return }
    vm.log()
    let { promptValue } = vm
    const msg = M('syn_input')
    if (promptValue == null) { promptValue = '8,0.05,0.15,5.8' }
    promptValue = prompt(msg, promptValue)
    if (promptValue == null) { return }
    vm.promptValue = promptValue
    const [id, minVowelLength, maxVowelLength, pitch] = promptValue.split(',')
    //lab0=vox.margeLab(lab0)
    const querys: any[] = vox.labToQuerys(lab0, {
      minVowelLength: +minVowelLength, maxVowelLength: +maxVowelLength, pitch: +pitch
    })
    const dev = import.meta.env.DEV
    let stream = IterableStream.from(querys.entries()).pipe(async function* (stream) {
      const isMorphing = id.indexOf(':') > 0
      let synthesis = vox.synthesis
      if (isMorphing) {
        let [a, b, c] = id.split(/\s*:\s*/)
        synthesis = (id: string, query: any) => vox.synthesis_morphing(a, b, c, query)
      }
      for await (const [i, query] of stream) {
        const msg = `${M('vox_syn')} (${i + 1}/${querys.length})`
        vm.log(msg)
        dev && console.log(`${msg} start`)
        const file = await synthesis(id, query)
        dev && console.log(`${msg} end`)
        yield { i, query, file }
      }
    }).pipe(async function* (stream) {
      let offset = 0, lab1 = '', reg = /([^\n]+\n)$/
      let fs: number, info: utils.AudioInfo | null, data: TypedArray<'float32' | 'float64'>
      for await (const { i, query, file } of stream) {
        const msg = `decodeAudio (${i + 1}/${querys.length})`
        dev && console.log(`${msg} start`)
        !({ fs, info, data } = await world.decodeAudio(file))
        dev && console.log(`${msg} end`)
        lab1 += vox.generateLab(query, offset).replace(reg, '#$1')
        offset += (data.length / fs) * 10000000
        yield new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      }
      init = {
        offset, lab1,
        Ctor: data!.constructor as any,
        info: info!, fs: fs!
      }
    })
    let init: {
      offset: number, lab1: string,
      Ctor: TypedArrayConstructor<'float32' | 'float64'>,
      info: utils.AudioInfo | null, fs: number
    }
    const audioBuffer = await new Response(stream.readable).arrayBuffer()
    vm.log(M('world_analysis'))
    const audio = new AudioData({
      data: new init!.Ctor(audioBuffer), fs: init!.fs, info: init!.info
    })
    audio.name = f0File.name.replace(/\.f0$/, `(${promptValue}).wav`)
    const result = await world.all(audio.data, audio.fs)

    vm.lab0 = lab0//.map(l=>l.join(' ')).join('\n')
    vm.lab1 = init!.lab1.replace(/#([^\n]+\n)$/, '$1')
    vm.audio = audio
    vm.worldResult = result
    vm.log()
    return vm.handleSynthesize
  })
})