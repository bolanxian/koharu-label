
import {
  Ndarray, TypedArray, hasType, isTypedArray, isTypedArrayConstructor,
  TypedArrayConstructor, TypedArrayValue, TypeNdarray
} from 'world-wasm/src/ndarray'
import * as z from 'zod'

export type { TypedArrayConstructor, TypedArrayValue, TypeNdarray }
export { Ndarray, TypedArray, hasType, isTypedArray, isTypedArrayConstructor }

//from https://github.com/type-challenges/type-challenges/issues/6309
type UnionToIntersection<T> = (T extends any ? (x: T) => void : never) extends (x: infer U) => void ? U : never
type PopUnion<T> = UnionToIntersection<T extends any ? (x: T) => void : never> extends (x: infer U) => void ? U : never
type UnionToTuple<T, U = PopUnion<T>> = [T] extends [never] ? [] : [...UnionToTuple<Exclude<T, U>>, U]

const types = Object.freeze({
  int8: Int8Array, uint8: Uint8Array, int16: Int16Array, uint16: Uint16Array,
  int32: Int32Array, uint32: Uint32Array, int64: BigInt64Array, uint64: BigUint64Array,
  float32: Float32Array, float64: Float64Array, uint8Clamped: Uint8ClampedArray
})
export type Types = keyof typeof types
export const zodDType = z.enum(Object.keys(types) as UnionToTuple<Types>)
export const zodTypedArray = z.instanceof(TypedArray)
const zodNdarrayInput = z.object({
  shape: z.array(z.number().int()),
  dtype: zodDType,
  buffer: z.instanceof(Uint8Array)
})
export type NdarrayPacked = z.input<typeof zodNdarrayInput>
export const zodNdarray = zodNdarrayInput.transform((val, ctx): TypedArray | Ndarray => Ndarray.unpack(val))
export const refine = <N extends number, T extends Types>(ndim: N, dtype?: T) => {
  return zodNdarray.refine((data: any): data is TypeNdarray<N, T> => Ndarray.isNdarray(data, ndim, dtype))
}
