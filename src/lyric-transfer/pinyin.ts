
import * as utils from './utils'
const { replacer, replacerShort, romaji } = utils
const map0 = new Map(Object.entries({
  'e': 'oa',
  'er': 'oa',
  'ri': 'i',
  'me': 'moa',
  'nv': 'nui',
  'nve': 'nue',
  'lv': 'rui',
  'lve': 'rue'
}))
export const list = replacerShort([
  [/^([zcs]h?)i$/, (m, $1) => `${mapc.get($1) ?? $1}u`],
  [/^([zcs]h?|[dtnlgkhry])ou$/, (m, $1) => `${mapc.get($1) ?? $1}o`],
  [/^([zcs]h?|[dtnlgkhr])e$/, (m, $1) => `${mapc.get($1) ?? $1}oa`],
  [/^([zcs]h?|[bpmfdtnlgkhryw])eng?$/, (m, $1) => `${mapc.get($1) ?? $1}on`],
  [/^([bpmfdtnljqx])ian$/, (m, $1) => `${mapc.get($1) ?? $1}ien`],
  [/^([yjqx])[uv](e|n|an)?$/, (m, $1, $2) => `${mapc.get($1) ?? $1}u${$2 || 'i'}`],
  [/^yi/, 'i'],
  [/^wu/, 'u'],
  // [/^([kg])u(.+)/, '$1w$2'],
  // [/^([lmphndtgk])i(.+)/, (m, $1, $2) => `${mapc.get($1) ?? $1}y${$2}`],
  // [/^([jqx])i([aeou]+)/, (m, $1, $2) => `${mapc.get($1) ?? $1}${$2}`],
])
const mapc = new Map(Object.entries({
  'zh': 'j',
  'c': 'ts',
  'l': 'r',
  'r': 'y',
  'q': 'ch',
  'x': 'sh'
}))
export const reg = /(zh|ch|sh|[bpmfdtnljqxzcsgkhryw])?([ui]?ang?|eng?|ing?|i?ong|u?ai|i?ao|[uv]n|[ui]a|[eu]i|[oi]u|[iuv]e|uo|er|[aoeiuv])/g
//(zh|ch|sh|[bpmfdtnljqxzcsghkryw])?([aeiouv]{1,2}(?:ng?|r)?)/g,
const toneMap = {
  "ā": "a1", "á": "a2", "ǎ": "a3", "à": "a4",
  "ō": "o1", "ó": "o2", "ǒ": "o3", "ò": "o4",
  "ē": "e1", "é": "e2", "ě": "e3", "è": "e4",
  "ī": "i1", "í": "i2", "ǐ": "i3", "ì": "i4",
  "ū": "u1", "ú": "u2", "ǔ": "u3", "ù": "u4",
  "ü": "v0", "ǖ": "v1", "ǘ": "v2", "ǚ": "v3",
  "ǜ": "v4", "ń": "n2", "ň": "n3", "": "m2"
}
export const toRomaji = replacer([[
  reg,
  (m, a = '', b: string, off: number, str: string) => {
    m = a + b
    let temp = map0.get(m)
    if (temp != null) { return temp }
    temp = list(m)
    if (temp !== m) { return temp }
    temp = mapc.get(a)
    if (temp != null) { a = temp }
    if (b.slice(-1) === 'g') { b = b.slice(0, -1) }
    return a + b
  }
]])
export const toHiragana = replacer([...toRomaji.map, ...romaji.toHiragana.map])
export const toKatakana = replacer([...toRomaji.map, ...romaji.toKatakana.map])
export const toneMapReg = RegExp(Object.keys(toneMap).join('|'), 'g')
export const toNumToneSingle = (str: string) => {
  let tone = ''
  str = str.replace(toneMapReg, (m) => {
    m = toneMap[m as keyof typeof toneMap]
    tone = m[1]
    return m[0]
  })
  return str + tone
}
export const toNumTone = replacer([[
  /\S+/g,
  toNumToneSingle
]])
