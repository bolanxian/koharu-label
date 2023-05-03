
import z from 'zod'
import { TypedArray } from './ndarray'

const { call } = Function.prototype, { toString } = Object.prototype
export const hasOwn = Object.hasOwn || call.bind({}.hasOwnProperty)
const plainObjects = new Set(['[object Object]', '[object Array]'])
export const isPlainObject = (data: any): data is Record<string | number | symbol, any> => plainObjects.has(toString.call(data))

export const zodAudioInfo = z.object({ format: z.string(), subtype: z.string() })
export type AudioInfo = z.input<typeof zodAudioInfo>
export class AudioData<HasInfo extends true | false = false>{
  static audioContext: AudioContext
  static audioTypes = new Set<string>(['wav', 'flac', 'mp3', 'ogg', 'm4a', 'mp4'])
  static play(abuf: AudioBuffer): AudioBufferSourceNode {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    const actx = this.audioContext
    const source = actx.createBufferSource()
    source.buffer = abuf
    source.connect(actx.destination)
    source.start()
    return source
  }
  static async fromFile(file: File, sampleRate = 48000): Promise<AudioData> {
    const ctx = new OfflineAudioContext({ length: 1, sampleRate })
    const abuf = await ctx.decodeAudioData(await file.arrayBuffer())
    const self = this.fromAudioBuffer(abuf)
    self.name = file.name
    return self
  }
  static fromAudioBuffer(abuf: AudioBuffer): AudioData {
    const self = new this({ data: abuf.getChannelData(0), fs: abuf.sampleRate })
    //self.audioBuffer=abuf
    return self
  }
  name: string
  info: HasInfo extends true ? AudioInfo : null
  data: TypedArray<'float32' | 'float64'>
  fs: number
  constructor(init: {
    data: TypedArray<'float32' | 'float64'>, fs: number
  } & (
      HasInfo extends true ? { info: AudioInfo } : { info?: null }
    )) {
    const { data, fs, info } = init
    this.name = ''
    this.data = data
    this.fs = fs
    this.info = info ?? null as any
  }
  getInfo(): string {
    let { info } = this, result = `sampleRate:${this.fs}`
    if (info != null) {
      result += `,format:${info.format}[${info.subtype}]`
    }
    return result
  }
  toWave(): Blob & never {
    throw new Error("Function not implemented.")
  }
  toAudioBuffer(): AudioBuffer {
    const { data, fs } = this
    const abuf = new AudioBuffer({ length: data.length, sampleRate: fs })
    abuf.getChannelData(0).set(data)
    return abuf
  }
}
Object.assign(AudioData.prototype, {
  [Symbol.toStringTag]: 'AudioData'
})
export const delay = (t: number): Promise<void> => new Promise(ok => { setTimeout(ok, t) })
export const byteorder = (() => {
  const { buffer } = Float64Array.of(1.982031)
  switch (String.fromCharCode(...new Uint8Array(buffer))) {
    case "\xE4\x87\x4A\x23\x66\xB6\xFF\x3F": return '<'
    case "\x3F\xFF\xB6\x66\x23\x4A\x87\xE4": return '>'
    case "\x66\xB6\xFF\x3F\xE4\x87\x4A\x23": return 'M'
  }
})()
export const assertByteorder = (expect: any): string | void => {
  if (byteorder !== expect) {
    return `字节序为 ${byteorder} ，预期应为 ${expect}`
  }
}
export function* xgetZeroRanges(buf: TypedArray): Generator<[number, number]> {
  let i, begin = null
  for (i = 0; i < buf.length; i++) {
    const isZero = buf[i] === 0
    if (begin === null) {
      if (isZero) { begin = i }
    } else {
      if (!isZero) { yield [begin, i]; begin = null }
    }
  }
  if (begin !== null) { yield [begin, i] }
}
export const getZeroRanges = (buf: TypedArray): [number, number][] => {
  return Array.from(xgetZeroRanges(buf))
}
export const EXT_REG = /\.([^.]+)$/
export const getFileExt = (file: File): string | null => {
  return file.name.match(EXT_REG)?.[1] ?? null
}
export const download = (sequence: string | BlobPart[] | Blob, filename = ''): void => {
  const a = document.createElement('a')
  a.download = filename
  if (typeof sequence === 'string') {
    a.href = sequence
  } else {
    const blob = (sequence instanceof Blob) ? sequence : new Blob(sequence)
    const src = a.href = URL.createObjectURL(blob)
    setTimeout(() => { URL.revokeObjectURL(src) }, 60000)
  }
  a.click()
}
export const fileSystemHandleVerifyPermission = async (handle: any | FileSystemDirectoryHandle, withWrite = false): Promise<boolean> => {
  const opts: any = {}, ok = 'granted'
  if (withWrite) { opts.mode = 'readwrite' }
  if (ok === await handle.queryPermission(opts)) { return true }
  if (ok === await handle.requestPermission(opts)) { return true }
  return false
}
export const saveFile = async (handle: FileSystemDirectoryHandle, sequence: BlobPart[] | Blob, name: string) => {
  const fileHandle = await handle.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    const blob = (sequence instanceof Blob) ? sequence : new Blob(sequence)
    await writable.write(blob)
  } finally {
    await writable.close()
  }
}
const Locale: void | typeof Intl.Locale = window?.Intl?.Locale ?? null
const maximize = typeof Locale === 'function' ? (lang: string) => new Locale(lang).maximize().baseName : String
type MapLang = boolean | string | Record<string, string>
export const multiLocale = (map: Record<string, MapLang>, langs = navigator.languages) => {
  for (let lang of langs) {
    let mapLang: void | MapLang
    if (hasOwn(map, lang)) {
      mapLang = map[lang]
    } else if (hasOwn(map, lang = maximize(lang))) {
      mapLang = map[lang]
    }

    if (typeof mapLang === 'string') {
      mapLang = map[mapLang]
    }
    if (mapLang === true) {
      return String
    } else if (typeof mapLang === 'object') {
      const map = mapLang
      return (msg: string) => hasOwn(map, msg) ? map[msg] : msg
    }
  }
  return String
  //throw new RangeError(`invalid language tag: ${JSON.stringify(langs)}`)
}