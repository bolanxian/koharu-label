/**
 * @createDate 2021-5-15 19:44:43
*/
import * as Vue from "vue"
const { defineComponent, createVNode: h, shallowRef: sr } = Vue
import * as iview from "view-ui-plus"
const { Row, Col, Affix, Card, Icon, Input, Button, ButtonGroup, Checkbox } = iview
import DropFile from '../components/drop-file.vue'
import Awaiter from "../components/awaiter.vue"
import hiragana2ChinesePronounce from './hiragana2chinese-pronounce'
import * as utils from './utils'
const { romaji, toHiragana, toKatakana, download, types } = utils
import * as pinyin from './pinyin'

type ReplaceFuncs = Record<string, (str: string) => string>
const replaceFuncs: ReplaceFuncs = {
  debugPinyin: str => str.replace(pinyin.reg, (m, a = '', b) => `[${a},${b}]`),
  pinyinToRomaji: pinyin.toRomaji,
  pinyinToHiragana: pinyin.toHiragana,
  pinyinToKatakana: pinyin.toKatakana,
  romajiToHiragana: romaji.toHiragana,
  romajiToKatakana: romaji.toKatakana,
  toHiragana, toKatakana,
  hiraganaToChinesePronounce: str => hiragana2ChinesePronounce(toHiragana(str))
}
const phonemesModeSet = new Set(['hiraganaToChinesePronounce'])

const pinyinjs = import('ipinyinjs/pinyinUtil').then(mod => mod.default)
pinyinjs.then(pinyinUtil => {
  Object.assign<ReplaceFuncs, ReplaceFuncs>(replaceFuncs, {
    hanziToPinyinTone: str => pinyinUtil.getPinyin(str, ' ', !0, !1),
    hanziToPinyinNumTone: str => pinyin.toNumTone(pinyinUtil.getPinyin(str, ' ', !0, !1)),
    hanziToPinyin: str => pinyinUtil.getPinyin(str, ' ', !1, !1),
  })
})

export default defineComponent({
  name: 'Lyric Transfer',
  data() {
    return {
      file: null as File | null,
      pinyinjs,
      length: '',
      lyrics: '',
      output: '',
      phonemesMode: false
    }
  },
  setup(props, ctx) {
    return {
      inst: sr<utils.InstTypes | null>(null)
    }
  },
  mounted() {
    this.$emit('mount:app', this)
  },
  methods: {
    async loadFile(type: utils.CtorTypes, file: File) {
      try {
        const inst = await type.loadAsFile(this.file = file)
        this.inst = inst
        const lyrics = inst.getLyrics()
        this.length = `[${lyrics.length}]`
        this.lyrics = lyrics.join('\n')
      } catch (e) {
        iview.Message.error('打开文件失败')
        console.error(e)
        this.close()
      }
    },
    handleChange(files: File[]) {
      for (const file of files) {
        const m = file.name.match(/\.([^.]+)$/)
        const type = m != null ? types[m[1] as keyof utils.Types] : null
        if (type != null) {
          return this.loadFile(type, file)
        }
      }
      iview.Message.warning('目前仅支持 musicxml 或 svp 文件')
    },
    close() {
      this.file = null
      this.inst = null
      this.length = ''
      this.lyrics = ''
      this.output = ''
    },
    reset() {
      const { file, inst } = this
      if (file == null || inst == null) { return }
      inst.reset()
      const lyrics = inst.getLyrics()
      this.length = `[${lyrics.length}]`
      this.lyrics = lyrics.join('\n')
    },
    export() {
      const { file, inst } = this
      if (file == null || inst == null) { return }
      const lrcs = (this.output || this.lyrics).split('\n')
      if (this.phonemesMode) {
        inst.setPhonemes(lrcs)
      } else {
        inst.setLyrics(lrcs)
      }
      download([inst.export()], file.name.replace(/(?=(?:\.\w*)?$)/, '_export'))
    },
    reverseCopy() {
      this.lyrics = this.output
    },
    handleReplace(key: string) {
      const cb = replaceFuncs[key]
      if (cb == null) { return }
      this.phonemesMode = phonemesModeSet.has(key)
      this.output = this.lyrics.split('\n').map(cb, this).join('\n')
    },
    handleSubmit(e: SubmitEvent) {
      e.preventDefault()
      e.stopPropagation()
      const key = e.submitter?.dataset.name
      if (key == null) { return }
      this.handleReplace(key)
    }
  },
  render() {
    const vm = this
    return h(Row, { gutter: 5 }, () => [
      h(Col, { xs: 24, lg: 12 }, () => h(Affix, {}, () => [
        vm.file != null ? h(Card, { icon: 'md-document', title: vm.file.name + vm.length }, {
          extra: () => h(Button, { onClick: vm.close }, () => h(Icon, { type: "md-close" })),
          default: () => [
            h(Button, { onClick: vm.reset }, () => '重置'),
            h(Button, { style: { float: 'right' }, onClick: vm.export }, () => '导出')
          ]
        }) : h(DropFile, { global: true, onChange: vm.handleChange }),
        h(Card, { title: '转换', style: { 'margin-top': '20px' } }, {
          extra: () => h(Button, { onClick: vm.reverseCopy }, () => '←复制'),
          default: () => h('form', { action: 'about:blank', onSubmit: vm.handleSubmit }, [
            h(Checkbox, {
              modelValue: vm.phonemesMode,
              'onUpdate:modelValue'(val: boolean) { vm.phonemesMode = val }
            }, () => '音素模式'), h('br'),
            h(Button, { 'html-type': 'submit', 'data-name': 'pinyinToRomaji' }, () => '拼音→罗马字'), h('br'),
            h(ButtonGroup, { style: { 'margin-top': '10px' } }, () => [
              h(Button, { 'html-type': 'submit', 'data-name': 'pinyinToHiragana' }, () => '拼音→平假名'),
              h(Button, { 'html-type': 'submit', 'data-name': 'romajiToHiragana' }, () => '罗马字→平假名'),
              h(Button, { 'html-type': 'submit', 'data-name': 'toHiragana' }, () => '片假名→平假名')
            ]), h('br'),
            h(ButtonGroup, { style: { 'margin-top': '10px' } }, () => [
              h(Button, { 'html-type': 'submit', 'data-name': 'pinyinToKatakana' }, () => '拼音→片假名'),
              h(Button, { 'html-type': 'submit', 'data-name': 'romajiToKatakana' }, () => '罗马字→片假名'),
              h(Button, { 'html-type': 'submit', 'data-name': 'toKatakana' }, () => '平假名→片假名')
            ]), h('br'),
            h(Awaiter, { promise: vm.pinyinjs }, {
              empty: () => null,
              default: (state: string, value: any) => [
                h(ButtonGroup, { style: { 'margin-top': '10px' } }, () => {
                  const disabled = state !== 'fulfilled', loading = state === 'pending'
                  const props = { disabled, loading, 'html-type': 'submit' }
                  return [
                    h(Button, { ...props, 'data-name': 'hanziToPinyinTone' }, () => '汉字→拼音(带声调)'),
                    h(Button, { ...props, 'data-name': 'hanziToPinyinNumTone' }, () => '汉字→拼音(数字声调)'),
                    h(Button, { ...props, 'data-name': 'hanziToPinyin' }, () => '汉字→拼音')
                  ]
                }), '(',
                h('a', { href: 'https://github.com/sxei/pinyinjs/', target: '_blank' }, 'pinyinjs'),
                ')', h('br')
              ]
            }),
            h(Button, {
              style: { 'margin-top': '10px' }, 'html-type': 'submit',
              'data-name': 'hiraganaToChinesePronounce'
            }, () => '假名→汉语音素'), '(',
            h('a', { href: 'https://www.nicovideo.jp/watch/sm38322727', target: '_blank' }, 'sm38322727'),
            ')', h('br')
          ])
        })
      ])),
      h(Col, { xs: 12, lg: 6 }, () => [
        h(Input, {
          type: "textarea",
          autosize: { minRows: 20, maxRows: 1 / 0 },
          placeholder: '输入歌词，或者导入文件',
          modelValue: vm.lyrics,
          'onUpdate:modelValue'(value: string) { vm.lyrics = value }
        })
      ]),
      h(Col, { xs: 12, lg: 6 }, () => [
        h(Input, {
          type: "textarea",
          autosize: { minRows: 20, maxRows: 1 / 0 },
          placeholder: '结果显示在这里，或者导出文件',
          modelValue: vm.output,
          'onUpdate:modelValue'(value: string) { vm.output = value }
        })
      ])
    ])
  }
})