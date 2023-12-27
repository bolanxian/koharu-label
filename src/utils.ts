
export const { apply } = Reflect
const { call: _call, bind: _bind } = Function.prototype
export const bindCall = apply(_bind, _bind, [_call]) as <F>(func: F) => <
  T, A extends F extends (...args: infer A) => any ? [...A] : never
>(thisArg: T, ...args: A) => F extends (this: T, ...args: A) => infer R ? R : never

export const call = bindCall(_call) as <T, A extends unknown[], R>(
  func: (this: T, ...args: A) => R, thisArg: T, ...args: A
) => R

const objectProto = Object.prototype
export const hasOwn = Object.hasOwn ?? bindCall(objectProto.hasOwnProperty)
export const getTagString = bindCall(objectProto.toString)
export const isPlainObject = (o: any): o is Record<string | number | symbol, any> => {
  o = getTagString(o)
  return o === '[object Object]' || o === '[object Array]'
}
export const { isArray } = Array

const EventTargetProto = EventTarget.prototype
export const on = bindCall(EventTargetProto.addEventListener)
export const off = bindCall(EventTargetProto.removeEventListener)

export const download = (parts: BlobPart[] | Blob, filename = ''): void => {
  const blob = isArray(parts) ? new Blob(parts) : parts
  const src = URL.createObjectURL(blob)
  setTimeout(() => { URL.revokeObjectURL(src) }, 60000)
  const a = document.createElement('a')
  a.download = filename
  a.href = src
  a.click()
}
