
import { default as axios } from "axios"
const vowels = 'pau,sil,cl,a,i,u,e,o,N'.split(',')
const consonants = 'k,ky,g,gy,s,sh,z,t,ts,ty,ch,d,dy,n,ny,h,hy,b,by,f,p,py,m,my,y,r,ry,v,w,j'.split(',')
export type LabLine = [number, number, string]
export type Lab = LabLine[]
function* xparseLab(lab: string | string[]): Generator<LabLine> {
  const reg = /^\s*(\d+)\s+(\d+)\s+([\S\s]*?)\s*$/
  for (const line of typeof lab === 'string' ? lab.split(/\r?\n/) : lab) {
    const m = line.match(reg)
    if (!m) { continue }
    let [_, off, off2, lrc] = m
    yield [+off, +off2, lrc]
  }
}
function* data_flag(x: [number, number, string][]): Generator<number> {
  const len = x.length - 1
  let i = 0, j = 0
  for (; i < len; i++) {
    yield j
    if (x[i][2] != x[i + 1][2]) { j += 1 }
  }
  yield j
}
const margeLab = (_lab: string | string[]): Lab => {
  const lab = Array.from(xparseLab(_lab))
  const flags = Array.from(data_flag(lab))
  const newLab: [number, number, string][] = []
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
const labToQuerys = (_lab: string | Lab, {
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
          text: lrc + vowel,
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
const getSpeakers = async () => {
  const { data } = await axios.get('http://127.0.0.1:50021/speakers')
  let str = ''
  for (const speaker of data) {
    for (const style of speaker.styles) {
      str += `${style.id}:${speaker.name}(${style.name})\n`
    }
  }
  return str
}
const synthesis = async (id: number | string, _query: any) => {
  let { accentPhrases, ...query } = _query
  query.accent_phrases = accentPhrases
  for (const accentPhrase of accentPhrases) {
    for (const mora of accentPhrase.moras) {
      mora.consonant_length = mora.consonantLength
      mora.vowel_length = mora.vowelLength
    }
  }
  const url = 'http://127.0.0.1:50021/synthesis?speaker=' + id
  const { data } = await axios.post<Blob>(url, query, { responseType: 'blob' })
  return data
}
//from https://github.com/VOICEVOX/voicevox/blob/main/src/store/audio.ts
const generateLab = (query: any, offset = 0): string => {
  //const query = state.audioItems[audioKey].query
  if (query == null) return ''
  const speedScale = query.speedScale

  let labString = ""
  let timestamp = offset

  labString += timestamp.toFixed() + " "
  timestamp += (query.prePhonemeLength * 10000000) / speedScale
  labString += timestamp.toFixed() + " "
  labString += "pau\n"

  for (const accentPhrase of query.accentPhrases) {
    for (const mora of accentPhrase.moras) {
      if (mora.consonantLength != null && mora.consonant != null) {
        labString += timestamp.toFixed() + " "
        timestamp += (mora.consonantLength * 10000000) / speedScale
        labString += timestamp.toFixed() + " "
        labString += mora.consonant + "\n"
      }
      labString += timestamp.toFixed() + " "
      timestamp += (mora.vowelLength * 10000000) / speedScale
      labString += timestamp.toFixed() + " "
      if (mora.vowel !== "N") {
        labString += mora.vowel.toLowerCase() + "\n"
      } else {
        labString += mora.vowel + "\n"
      }
    }

    if (accentPhrase.pauseMora != null) {
      labString += timestamp.toFixed() + " "
      timestamp += (accentPhrase.pauseMora.vowelLength * 10000000) / speedScale
      labString += timestamp.toFixed() + " "
      labString += accentPhrase.pauseMora.vowel + "\n"
    }
  }

  labString += timestamp.toFixed() + " "
  timestamp += (query.postPhonemeLength * 10000000) / speedScale
  labString += timestamp.toFixed() + " "
  labString += "pau\n"

  return labString

}
export {
  margeLab,
  labToQuerys,
  getSpeakers,
  synthesis,
  generateLab
}
