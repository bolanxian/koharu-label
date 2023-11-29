
import { isPlainObject } from "./utils"
const { padStart } = String.prototype, { trunc } = Math

export let baseURL = '', settingURL = ''
export const setBaseURL = (url: number | string = 50021) => {
  if (typeof url === 'number') { url = `http://127.0.0.1:${url}/` }
  settingURL = new URL('/setting', url).href
  baseURL = url
}
setBaseURL()
const vowels = 'pau,sil,cl,a,i,u,e,o,N'.split(',')
const consonants = 'k,ky,g,gy,s,sh,z,t,ts,ty,ch,d,dy,n,ny,h,hy,b,by,f,p,py,m,my,y,r,ry,v,w,j'.split(',')
export type LabLine = [number, number, string]
export type Lab = LabLine[]
export const LAB_REG = /^\s*(\d+)\s+(\d+)\s+([\S\s]*?)\s*$/
export function* xparseLab(lab: string | string[]): Generator<LabLine> {
  for (const line of typeof lab === 'string' ? lab.split(/\r?\n/) : lab) {
    const m = line.match(LAB_REG)
    if (!m) { continue }
    let [_, a, b, lrc] = m
    yield [+a, +b, lrc]
  }
}
function* data_flag(x: Lab): Generator<number> {
  const len = x.length - 1
  let i = 0, j = 0
  for (; i < len; i++) {
    yield j
    if (x[i][2] != x[i + 1][2]) { j += 1 }
  }
  yield j
}
export const margeLab = (_lab: string | string[]): Lab => {
  const lab = Array.from(xparseLab(_lab))
  const flags = Array.from(data_flag(lab))
  const newLab: Lab = []
  let i = 0
  for (; i < flags.length; i++) {
    const flag = flags[i]
    if (newLab[flag]) {
      newLab[flag][1] = lab[i][1]
    } else {
      newLab[flag] = [...lab[i]]
    }
  }
  return newLab
}
export const labToQuerys = (_lab: string | Lab, {
  minVowelLength = 0.05, maxVowelLength = 0.15, pitch = 5.8
} = {}) => {
  const { min, max } = Math
  const lab = Array.isArray(_lab) ? _lab : Array.from(xparseLab(_lab))
  const getVowelLength = (l: number) => max(min(l, maxVowelLength), minVowelLength)
  let moras = [], querys = []
  for (let i = 0; i < lab.length; i++) {
    const lrc = lab[i][2]
    if (lrc === 'pau' || lrc === 'sil') {
      if (moras.length) {
        querys.push({
          accentPhrases: [{
            moras, accent: 0,
            /* pauseMora:{
              text:"、",vowel:"pau",vowelLength,pitch:0
            }, */
            isInterrogative: false
          }],
          speedScale: 1, pitchScale: 0, intonationScale: 1,
          volumeScale: 1, prePhonemeLength: 0.1, postPhonemeLength: 0.1,
          outputSamplingRate: 24000, outputStereo: false, kana: ""
        })
        moras = []
      }
      continue
    }
    if (vowels.includes(lrc)) {
      moras.push({
        text: lrc, vowel: lrc,
        vowelLength: getVowelLength((lab[i][1] - lab[i][0]) / 10000000),
        pitch
      })
    } else if (consonants.includes(lrc)) {
      const vowel = lab[i + 1]
      if (vowels.includes(vowel[2])) {
        moras.push({
          text: lrc + vowel[2],
          consonant: lrc, consonantLength: (lab[i][1] - lab[i][0]) / 10000000,
          vowel: vowel[2], vowelLength: getVowelLength((vowel[1] - vowel[0]) / 10000000),
          pitch
        })
        i++
      }
    }
  }
  return querys
}
const voxFetch = async (url: string, requestData?: any, init: RequestInit = {}) => {
  url = new URL(url, baseURL).href
  if (requestData != null) {
    init.method ??= 'POST'
    if (isPlainObject(requestData)) {
      init.headers = new Headers(init.headers)
      init.headers.set('content-type', "application/json")
      init.body = JSON.stringify(requestData)
    } else {
      init.body = requestData
    }
  }
  init.credentials ??= 'omit'
  const request = new Request(url, init)
  const response = await fetch(request)
  const { status } = response
  if (!(status >= 200 && status < 300)) {
    throw new TypeError(`Request failed with status code ${status}`)
  }
  return { request, response }
}
export const getInfo = async () => {
  const version: string = await (await voxFetch('/version')).response.json()
  const data = await (await voxFetch('/engine_manifest')).response.json()
  return {
    name: data.name,
    brand_name: data.brand_name,
    icon: 'data:image/png;base64,' + data.icon,
    version
  }
}
export const getSpeakers = async () => {
  const { response } = await voxFetch('/speakers')
  const data = await response.json()
  let str = ''
  for (const speaker of data) {
    for (const style of speaker.styles) {
      const id = padStart.call(style.id, 3, ' ')
      const name = padStart.call(speaker.name, 6, '\u3000')
      str += `${id}:${name}（${style.name}）\n`
    }
  }
  return str
}
const presendQuery = (_query: any) => {
  const { accentPhrases, ...query } = _query
  query.accent_phrases = Array.from(accentPhrases as any[], _accentPhrase => {
    const { moras, ...accentPhrase } = _accentPhrase
    accentPhrase.moras = Array.from(moras as any[], _mora => {
      const { consonantLength, vowelLength, ...mora } = _mora
      mora.consonant_length = consonantLength
      mora.vowel_length = vowelLength
      return mora
    })
    return accentPhrase
  })
  return query
}
export const synthesis = async (id: string, query: any) => {
  const { response } = await voxFetch(`/synthesis?speaker=${id}`, presendQuery(query))
  return response.blob()
}
export const synthesis_morphing = async (base_speaker: string, target_speaker: string, morph_rate: string, query: any) => {
  const params = new URLSearchParams({ base_speaker, target_speaker, morph_rate })
  const { response } = await voxFetch(`/synthesis_morphing?${params}`, presendQuery(query))
  return response.blob()
}
//from https://github.com/VOICEVOX/voicevox/blob/main/src/store/audio.ts
export const xgenerateLab = function* (query: any, offset = 0): Generator<LabLine> {
  if (query == null) { return }
  const { speedScale } = query, rate = 10000000
  const x = (time: number, lrc: string = 'pau'): LabLine => {
    const a = trunc(offset)
    offset += (time * rate) / speedScale
    const b = trunc(offset)
    return [a, b, lrc]
  }

  yield x(query.prePhonemeLength)
  for (const accentPhrase of query.accentPhrases) {
    for (const mora of accentPhrase.moras) {
      if (mora.consonantLength != null && mora.consonant != null) {
        yield x(mora.consonantLength, mora.consonant)
      }
      yield x(mora.vowelLength, mora.vowel !== "N" ? mora.vowel.toLowerCase() : mora.vowel)
    }
    const { pauseMora } = accentPhrase
    if (pauseMora != null) {
      yield x(pauseMora.vowelLength, pauseMora.vowel)
    }
  }
  yield x(query.postPhonemeLength)
}
export const generateLab = (query: any, offset = 0): string => {
  let lab = ''
  for (const line of xgenerateLab(query, offset)) {
    lab += line.join(' ') + '\n'
  }
  return lab
}
