
import msgpack from "@ygoe/msgpack"
import { Ndarray, TypedArray } from "./ndarray"
import * as z from 'zod'
const { call } = Function.prototype, { toString } = Object.prototype
export const hasOwn = Object.hasOwn || call.bind({}.hasOwnProperty)
const plainObjects = new Set(['[object Object]', '[object Array]'])
export const isPlainObject = (data: any): data is Record<string | number | symbol, any> => plainObjects.has(toString.call(data))
const zodFloat64Array = Ndarray.refine(1, 'float64')
const zodFloat64Array2d = Ndarray.refine(2, 'float64')
const zodPyworldDio = z.object({
  t: zodFloat64Array,
  f0: zodFloat64Array
})
export type PyworldDio = z.infer<typeof zodPyworldDio>
const zodPyworldAll = zodPyworldDio.extend({
  sp: zodFloat64Array2d,
  ap: zodFloat64Array2d
})
export type PyworldAll = z.infer<typeof zodPyworldAll>
const zodAudioInfo = z.object({ format: z.string(), subtype: z.string() })
export type AudioInfo = z.input<typeof zodAudioInfo>
const zodAudioPacked = z.object({
  fs: z.number(),
  info: zodAudioInfo,
  data: z.union([zodFloat64Array, zodFloat64Array2d.transform(data => data[0])])
}).transform((init) => new AudioData<true>(init))

export class PyWorld {
  baseURL: string
  constructor(baseURL: string) {
    this.baseURL = new URL(baseURL, location.href).href
  }
  async fetch(url: string, requestData?: any, init: RequestInit = {}) {
    url = new URL(url, this.baseURL).href
    if (requestData != null) {
      init.method ??= 'POST'
      if (isPlainObject(requestData)) {
        init.headers = new Headers(init.headers)
        init.headers.set('content-type', "application/x-msgpack")
        init.body = msgpack.encode(requestData)
      } else {
        init.body = requestData
      }
    }
    init.credentials ??= 'include'
    const request = new Request(url, init)
    const response = await fetch(request)
    const { status } = response
    if (!(status >= 200 && status < 300)) {
      throw new TypeError('Request failed with status code ' + status)
    }
    let data: any
    if (response.headers.get('content-type') === "application/x-msgpack") {
      data = await response.arrayBuffer()
      data = msgpack.decode(new Uint8Array(data))
    }
    return { request, response, data }
  }
  debug(pair: {
    request: Request;
    response: Response;
    data: any;
  }) {
    const config = pair as any
    try {
      const timing = performance.getEntriesByName(pair.response.url)
      const lastTiming = timing[timing.length - 1]
      config.$timing = lastTiming
      config.$now = performance.now()
    } catch (e) { }
    (this as any).lastRespConfig = config
  }
  async available(format = ''): Promise<any> {
    const { data } = await this.fetch('soundfile/available/' + format)
    return data
  }
  async encodeAudio(data: TypedArray, fs: number, format: string, subtype: string): Promise<Blob> {
    const pair = await this.fetch('soundfile/write', {
      fs, data: Ndarray.pack(data), format, subtype
    }, {
      headers: { Accept: 'application/octet-stream' }
    })
    this.debug(pair)
    return pair.response.blob()
  }
  async decodeAudio(blob: Blob) {
    const pair = await this.fetch('soundfile/read', blob, {
      headers: { "Content-Type": 'application/octet-stream' }
    })
    this.debug(pair)
    return zodAudioPacked.parse(pair.data)
  }
  async dio(data: TypedArray, fs: number): Promise<PyworldDio> {
    const pair = await this.fetch('pyworld/dio', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(pair)
    return zodPyworldDio.parse(pair.data)
  }
  async harvest(data: TypedArray, fs: number): Promise<PyworldDio> {
    const pair = await this.fetch('pyworld/harvest', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(pair)
    return zodPyworldDio.parse(pair.data)
  }
  async all(data: TypedArray, fs: number): Promise<PyworldAll> {
    const pair = await this.fetch('pyworld/all', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(pair)
    return zodPyworldAll.parse(pair.data)
  }
  async synthesize(f0: Float64Array, sp: Ndarray, ap: Ndarray, fs: number): Promise<Float64Array> {
    const pair = await this.fetch('pyworld/synthesize', {
      fs,
      f0: Ndarray.pack(f0),
      sp: Ndarray.pack(sp),
      ap: Ndarray.pack(ap)
    })
    this.debug(pair)
    return zodFloat64Array.parse(pair.data)
  }
  async savefig(figlist: Ndarray[], log = true): Promise<Blob> {
    const pair = await this.fetch('pyworld/savefig', {
      figlist: Array.from(figlist, x => Ndarray.pack(x)), log
    }, {
      headers: { Accept: 'image/png' }
    })
    this.debug(pair)
    return pair.response.blob()
  }
}
export interface PyWorld {
  readonly name: string
  readonly [Symbol.toStringTag]: string
}
Object.assign(PyWorld.prototype, {
  name: 'PyWorld',
  [Symbol.toStringTag]: 'PyWorld'
})
export class AudioData<HasInfo extends boolean = false>{
  static audioContext: AudioContext
  static audioTypes = new Set<string | null>(['wav', 'flac', 'mp3', 'ogg', 'm4a', 'mp4'])
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
  data: TypedArray
  fs: number
  constructor(init: { data: TypedArray, fs: number } & (HasInfo extends true ? { info: AudioInfo } : { info?: null })) {
    const { data, fs, info } = init
    this.name = ''
    this.data = data
    this.fs = fs
    this.info = info ?? null as any
  }
  getInfo(): string {
    let { info } = this, result = `sampleRate:${this.fs}`
    if (info) {
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
    const bytesPer = this.data.BYTES_PER_ELEMENT, result = abuf.getChannelData(0)
    if (data instanceof Float32Array || data instanceof Float64Array) {
      result.set(data)
    } else {
      let i
      if (data instanceof Int16Array) {
        for (i = 0; i < data.length; i++) {
          result[i] = data[i] / 0x8000
        }
      } else if (data instanceof Uint8Array) {
        for (i = 0; i < data.length; i++) {
          result[i] = (data[i] - 0x80) / 0x100
        }
      }
    }
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
  const m = file.name.match(EXT_REG)
  return m && m[1]
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