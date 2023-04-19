
import * as WORLD from 'world-wasm'
import { AudioData } from './utils'

export const isSupport = typeof WebAssembly !== 'undefined'
type World = WORLD.World | WORLD.WorldAsync
export class WorldWasm {
  static async create(isAsync: boolean = true) {
    const world = await (isAsync ? WORLD.createAsync : WORLD.create)()
    return new this(world)
  }
  #world: World
  constructor(world: World) {
    this.#world = world
  }
  async encodeAudio(data: WORLD.X, fs: number, format?: string, subtype?: string): Promise<Blob> {
    return this.#world.wavwrite(data, fs)
  }
  async decodeAudio(blob: Blob) {
    const { x, fs, nbit } = await this.#world.wavread(await blob.arrayBuffer())
    return new AudioData<true>({ data: x, fs, info: { format: 'WAV', subtype: `PCM_${nbit}` } })
  }
  async dio(data: WORLD.X, fs: number) {
    const { f0, time_axis: t } = await this.#world.dio(data, fs, 5, true)
    return { t, f0 }
  }
  async harvest(data: WORLD.X, fs: number) {
    const { f0, time_axis: t } = await this.#world.harvest(data, fs, 5, true)
    return { t, f0 }
  }
  async all(data: WORLD.X, fs: number) {
    const world = this.#world
    const { f0: _f0, time_axis: t } = await world.dio(data, fs)
    const f0 = await world.stonemask(data, _f0, t, fs)
    const { spectrogram: sp } = await world.cheaptrick(data, f0, t, fs)
    const { aperiodicity: ap } = await world.d4c(data, f0, t, fs)
    return { t, f0, sp, ap }
  }
  async synthesize(f0: WORLD.F0, sp: WORLD.SP, ap: WORLD.AP, fs: number): Promise<WORLD.Y> {
    return this.#world.synthesis(f0, sp, ap, fs, 5)
  }
}
export interface WorldWasm {
  readonly name: string
  readonly [Symbol.toStringTag]: string
}
Object.assign(WorldWasm.prototype, {
  name: 'World-Wasm',
  [Symbol.toStringTag]: 'World-Wasm'
})