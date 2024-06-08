
import { call } from '../utils'
import table, { reg as _0 } from './romaji-table?table-reg'
const romajiReg = RegExp(_0, 'ig')
import reverseTable, { reg as _1 } from './romaji-table?table-reg&reverse'
const reverseRomajiReg = RegExp(_1, 'ig')
import halfKanaTable, { reg as _2 } from './halfkana-table?table-reg'
const halfKanaReg = RegExp(_2, 'g')
import fullKanaTable, { reg as _3 } from './halfkana-table?table-reg&reverse'
const fullKanaReg = RegExp(_3, 'g')

type Override<T, U> = U & Omit<T, keyof U>
type Replacer = [RegExp, string | ((sub: string, ...args: any[]) => string)]

const { fromCharCode } = String
const { toLowerCase, charCodeAt, replace, split } = String.prototype as Override<String, {
  replace(this: string, ...args: Replacer): string
  split(this: string, ...args: [string, number?]): string[]
}>

export const replacer = (list: Replacer[]) => {
  const fn = (str: string) => {
    for (const a of fn.map) {
      str = call(replace, str, a[0], a[1])
    }
    return str
  }
  fn.map = new Map(list)
  return fn
}
export const replacerShort = (list: Replacer[]) => {
  const fn = (str: string) => {
    for (const a of fn.map) {
      const s = call(replace, str, a[0], a[1])
      if (s !== str) { return s }
      str = s
    }
    return str
  }
  fn.map = new Map(list)
  return fn
}

const pre: Replacer[] = [
  [RegExp(`(.)(?=\\1)(?=${call(replace, _0, /\|(?:.|\\\\')(?=\||$)/g, '')})`, 'ig'), 'cl']
]
export const romaji = Object.freeze({
  __proto__: null!,
  table,
  reg: romajiReg,
  fromReg: reverseRomajiReg,
  from: replacer([[
    reverseRomajiReg,
    m => reverseTable[m] ?? m
  ]]),
  toHiragana: replacer([...pre, [
    romajiReg,
    m => {
      const s = table[call(toLowerCase, m)]
      return s != null ? call(split, s, ',', 1)[0] : m
    }
  ]]),
  toKatakana: replacer([...pre, [
    romajiReg,
    m => {
      const s = table[call(toLowerCase, m)]
      return s != null ? call(split, s, ',', 2)[1] : m
    }
  ]])
})
const createCharCodeOffset = (reg: RegExp, i: number) => {
  return replacer([[reg, m => fromCharCode(call(charCodeAt, m, 0) + i)]])
}

export const toHiragana = createCharCodeOffset(/[\u30a1-\u30f6]/g, -0x60)//カタカナをひらがなに変換する関数
export const toKatakana = createCharCodeOffset(/[\u3041-\u3096]/g, 0x60)//ひらがなをカタカナに変換する関数

export const toFullKana = replacer([[halfKanaReg, m => halfKanaTable[m]]])
export const toHalfKana = replacer([[fullKanaReg, m => fullKanaTable[m]]])
