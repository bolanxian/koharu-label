
import z from 'zod'
import { hasOwn, isArray } from '../utils'
import { TypedArray } from './ndarray'

export const zodAudioInfo = z.object({ format: z.string(), subtype: z.string() })
export type AudioInfo = z.input<typeof zodAudioInfo>
export class AudioData {
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
    self.#name = file.name
    return self
  }
  static fromAudioBuffer(abuf: AudioBuffer): AudioData {
    const self = new this({ data: abuf.getChannelData(0), fs: abuf.sampleRate })
    //self.audioBuffer=abuf
    return self
  }
  #data: TypedArray<'float32' | 'float64'>
  #fs: number
  #name: string
  #info: AudioInfo | null
  #decoder: string
  get data() { return this.#data }
  get fs() { return this.#fs }
  set name(name) { this.#name = name }
  get name() { return this.#name }
  get info() { return this.#info }
  get decoder() { return this.#decoder }
  constructor({ data, fs, name, info, decoder }: {
    data: TypedArray<'float32' | 'float64'>
    fs: number
    name?: string | null
    info?: AudioInfo | null
    decoder?: string | null
  }) {
    this.#data = data
    this.#fs = fs
    this.#name = name ?? ''
    this.#info = info ?? null
    this.#decoder = decoder ?? ''
  }
  getInfo(): string {
    let info = this.#info, result = `sampleRate: ${this.#fs}`
    if (info != null) {
      result += `, format: ${info.format}[${info.subtype}]`
    }
    if (this.#decoder) {
      result += `(${this.#decoder})`
    }
    return result
  }
  toWave(): Blob & never {
    throw new Error("Function not implemented.")
  }
  toAudioBuffer(): AudioBuffer {
    const data = this.#data
    const abuf = new AudioBuffer({ length: data.length, sampleRate: this.#fs })
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
  let begin: number | null = null
  let i = 0, len = buf.length
  for (; i < len; i++) {
    const isZero = buf[i] === 0
    if (begin == null) {
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
export const fillF0 = (f0: Float64Array, len: number) => {
  f0 = Float64Array.from(f0)
  const zeroRanges = getZeroRanges(f0)
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
    let ratio = (right - left) / (end - begin)
    ratio ||= 0
    for (let i = begin, j = 1; i < end; i++, j++) {
      f0[i] = left + ratio * j
    }
  }
  const { BYTES_PER_ELEMENT } = Float64Array, { byteLength } = f0
  let parts: Float64Array[]
  if (len > byteLength) {
    const post = new Float64Array((len - byteLength) / BYTES_PER_ELEMENT)
    parts = [f0, post.fill(f0.at(-1) ?? 0)]
  } else if (len < byteLength) {
    parts = [f0.subarray(0, len / BYTES_PER_ELEMENT)]
  } else {
    parts = [f0]
  }
  return parts
}

export const fileSystemHandleVerifyPermission = async (handle: any | FileSystemDirectoryHandle, withWrite = false): Promise<boolean> => {
  const opts: any = {}, ok = 'granted'
  if (withWrite) { opts.mode = 'readwrite' }
  if (ok === await handle.queryPermission(opts)) { return true }
  if (ok === await handle.requestPermission(opts)) { return true }
  return false
}
export const saveFile = async (handle: FileSystemDirectoryHandle, parts: BlobPart[] | Blob, name: string) => {
  const fileHandle = await handle.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    const blob = isArray(parts) ? new Blob(parts) : parts
    await writable.write(blob)
  } finally {
    await writable.close()
  }
}
const Locale: void | typeof Intl.Locale = window?.Intl?.Locale ?? null
const minimize = typeof Locale === 'function' ? (lang: string) => new Locale(lang).language : String
function* xlocaler(locales = navigator.languages, defaultLocale?: string) {
  yield* locales
  for (const locale of locales) { yield minimize(locale) }
  if (defaultLocale != null) { yield defaultLocale }
}
let defaultLocale = 'zh-Hans'
export const localer = <T extends Record<string, any>, D extends any>(
  getMap: (locale: string) => undefined | T, defaultValue: D, locales = navigator.languages
): (<K extends string>(msg: K) => K extends keyof T ? T[K] : D) => {
  for (const locale of xlocaler(locales, defaultLocale)) {
    const map = getMap(locale)
    if (map == null) { continue }
    return <K extends string>(msg: K) => (hasOwn(map, msg) ? map[msg] : defaultValue) as K extends keyof T ? T[K] : D
  }
  throw new RangeError(`invalid language tags: ${JSON.stringify(locales)}`)
}