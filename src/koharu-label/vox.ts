
import { call, isPlainObject } from '../utils'
const { from } = Array, { log } = Math
const LN2 = log(2), LN440 = log(440)

export let baseURL = ''
let settingURL: string | null = null
export const setBaseURL = (url: number | string = 50021) => {
  if (typeof url === 'number') { url = `http://127.0.0.1:${url}/` }
  settingURL = null
  baseURL = url
}
export const getSettingURL = () => {
  settingURL ??= new URL('/setting', baseURL).href
  return settingURL
}
setBaseURL()
export const voxFetch = async (url: string, requestData?: any, init: RequestInit = {}) => {
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
    version,
    name: data.name,
    brand_name: data.brand_name,
    icon: 'data:image/png;base64,' + data.icon,
    uuid: data.uuid,
    frameRate: data.frame_rate
  }
}
export const getSpeakers = async () => {
  const { response } = await voxFetch('/speakers')
  const data = await response.json()
  return from(data, ({ name, styles, speaker_uuid }) => {
    return {
      value: styles[0].id, label: name, uuid: speaker_uuid,
      children: from(styles, ({ name, id }) => {
        return { value: id, label: name }
      })
    }
  })
}
export const getSingers = async () => {
  type Line = { name: string, id: number }
  const { response } = await voxFetch('/singers')
  const data = await response.json()
  const query: Line[] = [], synthesis: Line[] = []
  for (const { name, styles } of data) {
    for (const { name: styleName, id, type } of styles) {
      const isSing = type === 'sing'
      const line = {
        id, name: `${name}（${isSing ? 'シング' : 'ハミング'}・${styleName}）`
      }
      if (isSing) { query[query.length] = line }
      synthesis[synthesis.length] = line
    }
  }
  return { query, synthesis }
}
export const singFrameAudioQuery = async (id: number, score: any) => {
  const { response } = await voxFetch(`/sing_frame_audio_query?speaker=${id}`, score)
  return await response.json()
}

const vowels = 'pau,sil,cl,a,i,u,e,o,N'.split(',')
const consonants = 'k,ky,g,gy,s,sh,z,t,ts,ty,ch,d,dy,n,ny,h,hy,b,by,f,p,py,m,my,y,r,ry,v,w,j'.split(',')
const keyToPitch = (key: number) => LN2 * ((key - 69) / 12) + LN440
export const singQueryToVvproj = (frameRate: number, score: any, query: any) => {
  const { notes } = score, { phonemes } = query
  let moras = [], querys = []
  for (let i = 1, j = 1; i < phonemes.length; i++) {
    const { phoneme, frame_length } = phonemes[i]
    if (phoneme === 'pau' || phoneme === 'sil') {
      if (moras.length) {
        querys.push({
          accentPhrases: [{
            moras, accent: 0,
            isInterrogative: false
          }],
          speedScale: 1,
          pitchScale: 0,
          intonationScale: 1,
          volumeScale: 1,
          prePhonemeLength: 0.1 - (moras[0].consonantLength ?? 0),
          postPhonemeLength: 0.1,
          outputSamplingRate: 24000,
          outputStereo: false,
          kana: ""
        })
        moras = []
      }
      continue
    }
    if (vowels.includes(phoneme)) {
      const { key, lyric } = notes[j++]
      moras.push({
        text: lyric, vowel: phoneme,
        vowelLength: frame_length / frameRate,
        pitch: keyToPitch(key)
      })
    } else if (consonants.includes(phoneme)) {
      const vowel = phonemes[i + 1]
      if (vowels.includes(vowel.phoneme)) {
        const { key, lyric } = notes[j++]
        moras.push({
          text: lyric,
          consonant: phoneme,
          consonantLength: frame_length / frameRate,
          vowel: vowel.phoneme,
          vowelLength: vowel.frame_length / frameRate,
          pitch: keyToPitch(key)
        })
        i++
      }
    }
  }
  return querys
}