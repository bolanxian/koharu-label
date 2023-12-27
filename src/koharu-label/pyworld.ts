
import msgpack from '@ygoe/msgpack'
import z from 'zod'
import { isPlainObject } from '../utils'
import { Ndarray, refine, TypedArray, TypeNdarray } from './ndarray'
import { zodAudioInfo, AudioData } from './utils'

const zodFloat64Array = refine(1, 'float64')
const zodFloat64Array2d = refine(2, 'float64')
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
        init.headers.set('content-type', 'application/x-msgpack')
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
    if (response.headers.get('content-type') === 'application/x-msgpack') {
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
  async encodeAudio(data: TypedArray & ArrayLike<number>, fs: number, format?: string, subtype?: string): Promise<Blob> {
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
      headers: { 'Content-Type': 'application/octet-stream' }
    })
    this.debug(pair)
    return zodAudioPacked.parse(pair.data)
  }
  async dio(data: TypedArray<'float32' | 'float64'>, fs: number): Promise<PyworldDio> {
    const pair = await this.fetch('pyworld/dio', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(pair)
    return zodPyworldDio.parse(pair.data)
  }
  async harvest(data: TypedArray<'float32' | 'float64'>, fs: number): Promise<PyworldDio> {
    const pair = await this.fetch('pyworld/harvest', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(pair)
    return zodPyworldDio.parse(pair.data)
  }
  async all(data: TypedArray<'float32' | 'float64'>, fs: number): Promise<PyworldAll> {
    const pair = await this.fetch('pyworld/all', {
      fs, data: Ndarray.pack(data)
    })
    this.debug(pair)
    return zodPyworldAll.parse(pair.data)
  }
  async synthesize(
    f0: TypedArray<'float64'>, sp: TypeNdarray<2, 'float64'>, ap: TypeNdarray<2, 'float64'>, fs: number
  ): Promise<TypedArray<'float64'>> {
    const pair = await this.fetch('pyworld/synthesize', {
      fs,
      f0: Ndarray.pack(f0),
      sp: Ndarray.pack(sp),
      ap: Ndarray.pack(ap)
    })
    this.debug(pair)
    return zodFloat64Array.parse(pair.data)
  }
  async savefig(figlist: (TypedArray | Ndarray)[], log = true): Promise<Blob> {
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