
import { romaji, utils } from './utils'
const { replacer, replacerShort } = utils
const map0 = new Map(Object.entries({
  'ar': 'a',
  'er': 'e',
  'ri': 'i',
  'me': 'mo',
  'nv': 'nui',
  'nve': 'nue',
  'lv': 'rui',
  'lve': 'rue'
}))
export const list = replacerShort([
  [/^(zh|ch|sh|[zcs])i$/, (m, $1) => `${mapc.get($1) ?? $1}u`],
  [/^(zh|ch|sh|[dtnlzcsgkhry])ou$/, (m, $1) => `${mapc.get($1) ?? $1}o`],
  [/^(ch|sh|[tnlgkhzc])e$/, (m, $1) => `${mapc.get($1) ?? $1}o`],
  [/^y[uv](e|n|an)?$/, (m, $1) => `yu${$1 || 'i'}`],
  [/^j[uv](e|n|an)?$/, (m, $1) => `ju${$1 || 'i'}`],
  [/^q[uv](e|n|an)?$/, (m, $1) => `chu${$1 || 'i'}`],
  [/^x[uv](e|n|an)?$/, (m, $1) => `shu${$1 || 'i'}`],
  [/^yi/, 'i'],
  [/^wu/, 'u']
  /*[/^ku(.+)/,'kw$1'],
  [/^gu(.+)/,'gw$1'],
  [/^li(.+)/,'ry$1'],
  [/^mi(.+)/,'my$1'],
  [/^pi(.+)/,'py$1'],
  [/^hi(.+)/,'hy$1'],
  [/^ni(.+)/,'ny$1'],
  [/^di(.+)/,'dy$1'],
  [/^ti(.+)/,'ty$1'],
  [/^gi(.+)/,'gy$1'],
  [/^ki(.+)/,'ky$1'],*/
  //[/^hu/,'fu'],
  /* [/^ji([aeou]+)/,'j$1'],
  [/^qi([aeou]+)/,'ch$1'],
  [/^xi([aeou]+)/,'sh$1'] */
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
    if (b.slice(-1) === 'g') { b = b.slice(0, -1) }
    m = a + b
    let temp = map0.get(m)
    if (temp != null) { return temp }
    temp = list(m)
    if (temp !== m) { return temp }
    temp = mapc.get(a)
    if (temp != null) { a = temp }
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
