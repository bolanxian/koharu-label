/**
 * @createDate 2024-2-20 12:54:01
*/
import { defineComponent, createVNode as h, shallowRef as sr } from 'vue'
import { Message, Row, Col, Card, Icon, Button, ButtonGroup, Select, Option } from 'view-ui-plus'

import { EXT_REG, getFileExt, download } from '../utils'
import DropFile from '../components/drop-file.vue'
import { Awaiter, AwaiterState } from '../components/awaiter.vue'
import * as vox from './vox'
import * as YAML from 'yaml'
const { trunc } = Math
const { apply } = Reflect

const utils2 = {
  ustxToNotesList(ustx: any, frameRate: number, i = 0) {
    const notesList: any[] = []
    const rate = frameRate * 60 / 480 / ustx.tempos[0].bpm
    const note0 = { frame_length: trunc(0.1 * frameRate), lyric: '' }
    let pos = 0, notes: any[] = [note0]
    for (const { position, duration, tone, lyric } of ustx.voice_parts[i].notes) {
      if (pos < position) {
        if (notes.length > 1) {
          notes[notes.length] = note0
          notesList[notesList.length] = notes
          notes = [note0]
        }
        pos = position
      }
      notes[notes.length] = {
        frame_length: trunc((position + duration) * rate) - trunc(position * rate),
        key: tone, lyric
      }
      pos += duration
    }
    notes[notes.length] = note0
    notesList[notesList.length] = notes
    return notesList
  },
  async notesListToQuerys(notesList: any[], frameRate: number, id: number, log: (a: number, b: number) => void) {
    const querys: any[] = []
    let i = 0; for (; i < notesList.length; i++) {
      log(i, notesList.length)
      const score = { notes: notesList[i] }
      querys.push(...vox.singQueryToVvproj(
        frameRate, score,
        await vox.singFrameAudioQuery(id, score)
      ))
    }
    log(i, notesList.length)
    return querys
  },
  querysToVvproj(querys: any[], info: VoxInfo, speakerIndex: number, speakerStyleIndex: number) {
    const speaker = info.speakers[speakerIndex]
    const voice = {
      engineId: info.uuid, speakerId: speaker.uuid,
      styleId: speaker.children[speakerStyleIndex].value
    }
    const audioKeys: any[] = [], audioItems: any = {}
    for (let i = 0; i < querys.length; i++) {
      const query = querys[i]
      let text = ''
      for (const phrase of query.accentPhrases) {
        for (const mora of phrase.moras) {
          text += mora.text
        }
      }
      audioKeys[i] = `${i}`
      audioItems[i] = { text, voice, query }
    }
    return JSON.stringify({
      appVersion: "0.16.1", audioKeys, audioItems
    })
  }
}
type VoxInfo = Awaited<ReturnType<typeof getVoxInfo>>
const getVoxInfo = async () => {
  const info = await vox.getInfo()
  const speakers = await vox.getSpeakers()
  const singers = await vox.getSingers()
  return { ...info, speakers, singers }
}

export default defineComponent({
  name: 'Koharu Label Syncer',
  props: {
    backend: { type: String, default: '' },
    baseURL: { type: String, default: '/' }
  },
  setup(props) {
    const ustxFile = sr<File | null>(null)
    const ustx = sr<any>(null)
    const ustxPartIndex = sr(-1)
    const voxInfo = sr<VoxInfo | null>(null)
    const voxInfoPromise = sr(getVoxInfo())
    const querySingerIndex = sr(-1)
    const speakerIndex = sr(-1)
    const speakerStyleIndex = sr(-1)

    const process = sr<string | null>(null)
    const message = sr<string | null>(null)
    const createProcesser = <
      A extends unknown[]
    >(name: string, cb: (...args: [...A]) => Promise<File>) => {
      return async function (...args: [...A]) {
        if (process.value != null) { return }
        process.value = name
        try {
          const file = await apply(cb, null, args)
          download(file, file.name)
        } catch (e) {
          Message.error('失败')
          throw e
        } finally {
          process.value = null
          message.value = null
        }
      }
    }

    return {
      process,
      message,
      ustxFile,
      ustx,
      ustxPartIndex,
      voxInfo,
      voxInfoPromise,
      querySingerIndex,
      speakerIndex,
      speakerStyleIndex,
      exportVvprojFile: createProcesser('vvproj', async () => {
        const info = voxInfo.value!, { frameRate } = info
        const id = info.singers.query[querySingerIndex.value].id

        const notesList = utils2.ustxToNotesList(ustx.value, frameRate, ustxPartIndex.value)
        const querys = await utils2.notesListToQuerys(notesList, frameRate, id, (a, b) => {
          const msg = `${a}/${b}`
          message.value = msg
        })
        const vvproj = utils2.querysToVvproj(querys, info, speakerIndex.value, speakerStyleIndex.value)
        return new File([vvproj], ustxFile.value!.name.replace(EXT_REG, '.vvproj'))
      })
    }
  },
  methods: {
    getVoxInfo() {
      this.voxInfo = null
      this.voxInfoPromise = getVoxInfo()
    },
    setVoxBaseURL() {
      let url = prompt('VOICEVOX Engine URL:', vox.baseURL)
      if (url == null) { return }
      vox.setBaseURL(url || void 0)
      this.voxInfo = null
      this.voxInfoPromise = getVoxInfo()
    },
    handleChange(files: File[]) {
      for (const file of files) {
        const type = getFileExt(file)
        if (type === 'ustx') { this.openUstxFile(file) }
      }
    },
    async openUstxFile(file: File) {
      this.ustx = YAML.parse(await file.text())
      this.ustxPartIndex = 0
      this.ustxFile = file
    },
    closeUstxFile() {
      this.ustx = null
      this.ustxPartIndex = -1
      this.ustxFile = null
    }
  },
  render() {
    const vm = this
    return h(Row, { gutter: 5 }, () => [
      h(Col, { xs: 24, lg: 12 }, () => [
        h(DropFile, { global: true, onChange: vm.handleChange }),
        h(Card, {
          icon: vm.ustxFile != null ? 'md-document' : '',
          title: vm.ustxFile?.name ?? '需要 ustx 文件'
        }, {
          extra: () => h(Button, {
            disabled: vm.process != null || vm.ustxFile == null,
            onClick: vm.closeUstxFile
          }, () => h(Icon, { type: 'md-close' })),
          default: () => h(Select, {
            style: 'width:320px;display:block;margin-bottom:.8em',
            transfer: true,
            disabled: vm.process != null || vm.ustx == null,
            modelValue: vm.ustxPartIndex,
            'onUpdate:modelValue'(i: number) { vm.ustxPartIndex = i }
          }, () => {
            return vm.ustx != null
              ? Array.from(vm.ustx.voice_parts, ({ name }, i) => {
                return h(Option, { value: i }, () => name)
              })
              : null
          })
        }),
        h(Card, {
          icon: vm.ustxFile != null && vm.voxInfo != null ? 'md-document' : '',
          title: `导出${vm.message != null ? `\u3000（${vm.message}）` : ''}`
        }, {
          extra: () => h(ButtonGroup, {}, () => {
            const { process } = vm
            return [
              h(Button, {
                disabled: process != null || vm.ustx == null || vm.voxInfo == null || !(vm.speakerStyleIndex >= 0),
                loading: process === 'vvproj',
                onClick: vm.exportVvprojFile
              }, () => 'vvproj')
            ]
          }),
          default: () => {
            const info = vm.voxInfo
            return [
              h(Select, {
                style: 'width:320px;display:block;margin-bottom:.8em',
                transfer: true,
                disabled: vm.process != null || info == null,
                modelValue: vm.querySingerIndex,
                'onUpdate:modelValue'(i: number) { vm.querySingerIndex = i }
              }, () => {
                return info != null
                  ? Array.from(info.singers.query, ({ name }, i) => {
                    return h(Option, { key: name, value: i }, () => name)
                  })
                  : null
              }),
              h(Select, {
                style: 'width:200px',
                transfer: true,
                disabled: vm.process != null || info == null,
                modelValue: vm.speakerIndex,
                'onUpdate:modelValue'(i: number) { vm.speakerIndex = i; vm.speakerStyleIndex = 0 }
              }, () => {
                return info != null
                  ? Array.from(info.speakers, ({ label }, i) => {
                    return h(Option, { key: label, value: i }, () => label)
                  })
                  : null
              }),
              h(Select, {
                style: 'width:200px',
                transfer: true, placeholder: '',
                disabled: vm.process == null && info != null ? info.speakers[vm.speakerIndex] == null : true,
                modelValue: vm.speakerStyleIndex,
                'onUpdate:modelValue'(i: number) { vm.speakerStyleIndex = i }
              }, () => {
                return info != null ? info.speakers[vm.speakerIndex] != null
                  ? Array.from(info.speakers[vm.speakerIndex].children, ({ label }, i) => {
                    return h(Option, { key: label, value: i }, () => label)
                  })
                  : null : null
              })

            ]
          }
        }),
        h(Awaiter, {
          promise: vm.voxInfoPromise,
          onFulfilled(info: VoxInfo) { vm.voxInfo = info; vm.querySingerIndex = 0 },
        }, (state: AwaiterState, info: VoxInfo) => {
          const fulfilled = state === 'fulfilled', rejected = state === 'rejected'
          const loading = state === 'pending', empty = state === 'empty'
          return h(Card, {}, {
            title: () => [
              h('p', {}, [h('span', {}, [fulfilled ? info.brand_name : 'VOICEVOX'])]),
              fulfilled ? h('div', { class: 'ivu-cell-label' }, [info.name]) : null,
              fulfilled ? h('div', { class: 'ivu-cell-label' }, [`版本：${info.version}`]) : null
            ],
            extra: () => h(ButtonGroup, {}, () => [
              h(Button, { loading, onClick: vm.setVoxBaseURL }, () => 'URL'),
              h(Button, { disabled: loading, onClick: vm.getVoxInfo }, () => '刷新')
            ]),
            default: () => {
              if (rejected) {
                const href = vox.getSettingURL()
                return [
                  '连接 VOICEVOX ENGINE 失败', h('br'),
                  '可能需要前往 ', h('a', { target: '_blank', href }, [href]), ' 设置CORS'
                ]
              }
            }
          })
        }),
      ])
    ])
  }
})