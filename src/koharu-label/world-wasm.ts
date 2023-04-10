
import * as WORLD from 'world-wasm'
import { AudioData } from './utils'
import TypedArray = WORLD.ndarray.TypedArray
import TypeNdarray = WORLD.ndarray.TypeNdarray
export const isSupport = typeof WebAssembly !== 'undefined'
export class WorldWasm {
  static async create(isAsync: boolean = true) {
    const world = await (isAsync ? WORLD.createAsync : WORLD.create)()
    return new this(world)
  }
  #world: WORLD.World | WORLD.WorldAsync
  constructor(world: WORLD.World | WORLD.WorldAsync) {
    this.#world = world
  }
  async encodeAudio(
    data: TypedArray<'float32' | 'float64'>, fs: number, format?: string, subtype?: string
  ): Promise<Blob> {
    return this.#world.wavwrite(data, fs)
  }
  async decodeAudio(blob: Blob) {
    const [data, fs] = await this.#world.wavread(await blob.arrayBuffer())
    return new AudioData({ data, fs })
  }
  async dio(data: TypedArray<'float32' | 'float64'>, fs: number) {
    const [f0, t] = await this.#world.dio(data, fs, 5, true)
    return { t, f0 }
  }
  async harvest(data: TypedArray<'float32' | 'float64'>, fs: number) {
    const [f0, t] = await this.#world.harvest(data, fs, 5, true)
    return { t, f0 }
  }
  async all(data: TypedArray<'float32' | 'float64'>, fs: number) {
    const world = this.#world
    const [_f0, t] = await world.dio(data, fs)
    const f0 = await world.stonemask(data, _f0, t, fs)
    const sp = await world.cheaptrick(data, f0, t, fs)
    const ap = await world.d4c(data, f0, t, fs)
    return { t, f0, sp, ap }
  }
  async synthesize(
    f0: TypedArray<'float64'>, sp: TypeNdarray<2, 'float64'>, ap: TypeNdarray<2, 'float64'>, fs: number
  ): Promise<TypedArray<'float64'>> {
    return this.#world.synthesis(f0, sp, ap, fs)
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