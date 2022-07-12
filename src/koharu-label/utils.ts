
import { default as axios, AxiosRequestHeaders, AxiosResponse, AxiosInstance } from "axios"
import msgpack from "@ygoe/msgpack"
import { Ndarray, TypedArray } from "./ndarray"
import * as z from 'zod'
const { toString } = Object.prototype
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
const zodAudioPacked = z.object({
  fs: z.number(),
  info: zodAudioInfo,
  data: zodFloat64Array
}).transform(({ data, fs, info }, ctx): AudioData & { info: z.input<typeof zodAudioInfo> } => {
  const adata = new AudioData(data, fs)
  adata.info = info
  return adata as any
})
export class PyWorld {
  baseURL: string
  axios: AxiosInstance
  constructor(baseURL: string) {
    this.baseURL = baseURL = new URL(baseURL, location.href).href
    this.axios = axios.create({
      baseURL,
      headers: {
        Accept: 'application/x-msgpack'
      },
      responseType: 'arraybuffer',
      transformRequest: [(data, headers?: AxiosRequestHeaders) => {
        if (headers && isPlainObject(data)) {
          headers["Content-Type"] = "application/x-msgpack"
          data = msgpack.encode(data)
        }
        return data
      }],
      transformResponse: [(data, headers?: AxiosRequestHeaders) => {
        if (headers && headers["content-type"] === "application/x-msgpack") {
          data = msgpack.decode(new Uint8Array(data))
        }
        return data
      }]
    })
  }
  debug(resp: AxiosResponse): void {
    const config = resp.config as any
    config.responseHeaders = resp.headers
    try {
      const timing = performance.getEntriesByName(resp.request.responseURL)
      const lastTiming = timing[timing.length - 1]
      config.$timing = lastTiming
      config.$now = performance.now()
    } catch (e) { }
    (this as any).lastRespConfig = config
  }
  async available(format = ''): Promise<any> {
    const resp = await this.axios.get('soundfile/available/' + format)
    return resp.data
  }
  async encodeAudio(data: TypedArray, fs: number, format: string, subtype: string): Promise<Blob> {
    const resp = await this.axios.post<Blob>('soundfile/write', {
      fs, data: Ndarray.pack(data), format, subtype
    }, {
      responseType: 'blob', headers: { Accept: 'application/octet-stream' }
    })
    this.debug(resp)
    return resp.data
  }
  async decodeAudio(blob: Blob) {
    const resp = await this.axios.post('soundfile/read', blob, {
      headers: { "Content-Type": 'application/octet-stream' }
    })
    this.debug(resp)
    return zodAudioPacked.parse(resp.data)
  }
  async dio(data: TypedArray, fs: number): Promise<PyworldDio> {
    const resp = await this.axios.post('pyworld/dio', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(resp)
    return zodPyworldDio.parse(resp.data)
  }
  async harvest(data: TypedArray, fs: number): Promise<PyworldDio> {
    const resp = await this.axios.post('pyworld/harvest', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(resp)
    return zodPyworldDio.parse(resp.data)
  }
  async all(data: TypedArray, fs: number): Promise<PyworldAll> {
    const resp = await this.axios.post('pyworld/all', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(resp)
    return zodPyworldAll.parse(resp.data)
  }
  async synthesize(f0: Float64Array, sp: Ndarray, ap: Ndarray, fs: number): Promise<Float64Array> {
    const resp = await this.axios.post('pyworld/synthesize', {
      fs,
      f0: Ndarray.pack(f0),
      sp: Ndarray.pack(sp),
      ap: Ndarray.pack(ap)
    })
    this.debug(resp)
    return zodFloat64Array.parse(resp.data)
  }
  async savefig(figlist: Ndarray[], log = true): Promise<Blob> {
    const resp = await this.axios.post<Blob>('pyworld/savefig', {
      figlist: Array.from(figlist, x => Ndarray.pack(x)), log
    }, {
      responseType: 'blob', headers: { Accept: 'image/png' }
    })
    this.debug(resp)
    return resp.data
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
export class AudioData {
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
    const self = new this(abuf.getChannelData(0), abuf.sampleRate)
    //self.audioBuffer=abuf
    return self
  }
  name: string
  info?: { format: string, subtype: string }
  data: TypedArray
  fs: number
  constructor(data: TypedArray, fs: number) {
    this.name = ''
    this.data = data
    this.fs = fs
  }
  getInfo(): string {
    let { info } = this, result = `sampleRate:${this.fs}`
    if (info) {
      result += `,format:${info.format}[${info.subtype}]`
    }
    return result
  }
  toWave(): Blob {
    throw new Error("Function not implemented.")
  }
  toAudioBuffer(): AudioBuffer {
    const { data, fs } = this
    const abuf = new AudioBuffer({ length: data.length, sampleRate: fs })
    const bytesPer = this.data.BYTES_PER_ELEMENT, result = abuf.getChannelData(0)
    if (data instanceof Float32Array || data instanceof Float64Array) {
      result.set(data)
    } else if (data instanceof Int16Array) {
      for (var i = 0; i < data.length; i++) {
        result[i] = data[i] / 0x8000
      }
    } else if (data instanceof Uint8Array) {
      for (var i = 0; i < data.length; i++) {
        result[i] = (data[i] - 0x80) / 0x100
      }
    } else {

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
export function* xgetZeroRanges(buf: TypedArray): Generator<[number, number]> {
  var begin = null
  for (var i = 0; i < buf.length; i++) {
    var isZero = buf[i] === 0
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
export const fileSystemHandleVerifyPermission = async (handle: any | FileSystemDirectoryHandle, withWrite = false): Promise<boolean> => {
  const opts: any = {}, ok = 'granted'
  if (withWrite) { opts.mode = 'readwrite' }
  if (ok === await handle.queryPermission(opts)) { return true }
  if (ok === await handle.requestPermission(opts)) { return true }
  return false
}