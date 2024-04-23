
import { call } from '../utils'
import table, { reg as romajiReg } from './romaji-table?table-reg'
import reverseTable, { reg as reverseRomajiReg } from './romaji-table?table-reg&reverse'
import halfKanaTable, { reg as halfKanaReg } from './halfkana-table?table-reg'
import fullKanaTable, { reg as fullKanaReg } from './halfkana-table?table-reg&reverse'

type Replacer = [RegExp, string | ((sub: string, ...args: any[]) => string)]

const { fromCharCode } = String
const { charCodeAt, replace, split } = String.prototype as {
  charCodeAt: String['charCodeAt']
  replace(this: string, ...args: Replacer): string
  split(this: string, ...args: [string, number?]): string[]
}

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

export const romaji = Object.freeze({
  __proto__: null as never,
  table,
  reg: romajiReg,
  fromReg: reverseRomajiReg,
  from: replacer([[
    reverseRomajiReg,
    m => reverseTable[m] ?? m
  ]]),
  toHiragana: replacer([[
    romajiReg,
    m => {
      const s = table[m]
      return s != null ? call(split, s, ',', 1)[0] : m
    }
  ]]),
  toKatakana: replacer([[
    romajiReg,
    m => {
      const s = table[m]
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
