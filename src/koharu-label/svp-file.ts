
import YAML from "yaml"
import sampleUstx from '../assets/sample.ustx?raw'
const { trunc, floor } = Math
const attributes = {
  "tF0Offset": 0, "tF0Left": 0, "tF0Right": 0, "dF0Left": 0, "dF0Right": 0, "dF0Vbr": 0
}
const randBuf = new Uint16Array(8)
const vowels = 'pau,sil,cl,a,i,u,e,o,N'.split(',')
const consonants = 'k,ky,g,gy,s,sh,z,t,ts,ty,ch,d,dy,n,ny,h,hy,b,by,f,p,py,m,my,y,r,ry,v,w,j'.split(',')
interface Note {
  onset: number
  duration: number
  lyrics: string
  phonemes: string
  pitch: number
  detune: number
  attributes?: typeof attributes
}
export default class SvpFile {
  static createNote(onset: number, duration: number, lyrics: string, pitch: number): Note {
    return {
      onset, duration, lyrics, phonemes: "", pitch, "detune": 0, attributes
    }
  }
  static generateUUID(): string {
    crypto.getRandomValues(randBuf)
    const a = Array.from(randBuf, n => n.toString(16).padStart(4, '0'))
    return [a[0] + a[1], a[2], a[3], a[4], a[5] + a[6] + a[7]].join('-')
  }
  readonly bpm: number
  readonly offsetRatio: number
  basePitch: number
  pitchDelta: number[]
  loudness: number[]
  notes: Note[]
  constructor(bpm: number) {
    this.bpm = bpm
    this.offsetRatio = bpm * 705600000 / 60

    this.basePitch = 60
    this.pitchDelta = []
    this.loudness = []
    this.notes = []
  }
  calcOffset(sec: number): number {
    return trunc(sec * this.offsetRatio)
  }
  calcLabOffset(sec: number): number {
    return trunc(sec * this.offsetRatio / 10000000)
  }
  createNote(onset: number, duration: number, lyrics: string): Note {
    return SvpFile.createNote(
      this.calcOffset(onset), this.calcOffset(duration), lyrics, this.basePitch
    )
  }
  *xparseLab(lab: string | Iterable<string>): Generator<[number, number, string]> {
    const reg = /^\s*(\S+)\s+(\S+)\s+([\S\s]*?)\s*$/
    for (const line of typeof lab === 'string' ? lab.split(/\r?\n/) : lab) {
      const m = line.match(reg)
      if (m == null) { continue }
      let [_, off, off2, lrc] = m
      yield [
        this.calcLabOffset(+off),
        this.calcLabOffset(+off2),
        lrc
      ]
    }
  }
  injectLab(lab: string | Iterable<string>) {
    for (const [off, off2, lrc] of this.xparseLab(lab)) {
      if (lrc === 'pau' || lrc === 'sil') { continue }
      const note = SvpFile.createNote(off, off2 - off, lrc, this.basePitch)
      if (consonants.includes(lrc)) {
        note.phonemes = lrc
      }
      this.notes.push(note)
    }
  }
  injectPitch(f0: Float64Array, t: Float64Array) {
    const pitchOffset = 100 * (69 - this.basePitch)
    for (let i = 0; i < t.length; i++) {
      if (f0[i] < 55) { continue }
      const off = this.calcOffset(t[i])
      const pit = 100 * 12 * Math.log2(f0[i] / 440)
      this.pitchDelta.push(off, pit + pitchOffset)
    }
  }
  findPitchRange(begin: number, end: number, beginIndex: number = 0): [number, number] {
    const pitch = this.pitchDelta
    let i = beginIndex
    for (; i < pitch.length; i += 2) {
      if (pitch[i] >= begin) { beginIndex = i; break }
    }
    for (; i < pitch.length; i += 2) {
      if (pitch[i] > end) { return [beginIndex, i] }
    }
    return [i, 0]
  }
  calcMaxPitch(beginIndex: number, endIndex: number) {
    const pitch = this.pitchDelta, pits = new Map()
    for (let i = beginIndex + 1; i < endIndex; i += 2) {
      const pit = Math.round(pitch[i] / 100)
      if (pits.has(pit)) {
        pits.set(pit, pits.get(pit) + 1)
      } else {
        pits.set(pit, 1)
      }
    }
    let max = [0, 0]
    for (const cur of pits.entries()) {
      if (max[1] < cur[1]) {
        max = cur
      } else if (max[1] === cur[1]) {
        if (max[0] > cur[0]) { max = cur }
      }
    }
    return max[0]
  }
  margeConsonantNote() {
    const { notes } = this
    let i = 0, len = notes.length - 1; for (; i < len; i++) {
      const note = notes[i]
      if (!consonants.includes(note.lyrics)) { continue }
      const next = notes[i + 1]
      if (consonants.includes(next.lyrics)) { continue }
      const prev = notes[i - 1]
      next.lyrics = note.phonemes + next.lyrics
      if (prev?.onset + prev?.duration === note.onset) {
        prev.duration += note.duration
      }
      //note.phonemes = note.lyrics = ''
      notes.splice(i, 1)
      len = notes.length - 1
    }
  }
  refinePitch() {
    const { notes } = this, pitch = this.pitchDelta
    let i, j, beginIndex, endIndex
    for (i = 0; i < notes.length; i++) {
      const note = notes[i]
        ;[beginIndex, endIndex] = this.findPitchRange(
          note.onset, note.onset + note.duration, beginIndex
        )
      if (beginIndex >= endIndex) { continue }
      let maxPitch = this.calcMaxPitch(beginIndex, endIndex)
      note.pitch += maxPitch
      maxPitch *= 100
      for (j = beginIndex + 1; j < endIndex; j += 2) {
        pitch[j] -= maxPitch
      }
    }
  }
  *xcalcLoudnessWithEnvelope(buf: ArrayLike<number>, fs: number): Generator<number> {
    const { abs, sign, log10, max } = Math
    for (let i = 1, len = buf.length - 1; i < len; i++) {
      const v0 = abs(buf[i - 1]), v1 = abs(buf[i]), v2 = abs(buf[i + 1])
      const a = sign(v1 - v0), b = sign(v1 - v2)
      if (a + b > 0) {
        yield this.calcOffset(i / fs)
        yield max(20 * log10(v1), -38)
      }
    }
  }
  injectLoudnessWithEnvelope(buf: ArrayLike<number>, fs: number) {
    for (const s of this.xcalcLoudnessWithEnvelope(buf, fs)) {
      this.loudness.push(s)
    }
  }
  toJSON(name?: string) {
    const mainId = SvpFile.generateUUID()
    const libId = SvpFile.generateUUID()
    const emptyParam = { "mode": "cubic", "points": [] }
    return {
      "version": 119,
      "time": {
        "meter": [{ "index": 0, "numerator": 4, "denominator": 4 }],
        "tempo": [{ "position": 0, "bpm": this.bpm }]
      },
      "library": [{
        "name": name ?? "Part 1", "uuid": libId,
        "parameters": {
          "pitchDelta": { "mode": "cubic", "points": this.pitchDelta },
          "vibratoEnv": emptyParam,
          "loudness": { "mode": "cubic", "points": this.loudness },
          "tension": emptyParam,
          "breathiness": emptyParam,
          "voicing": emptyParam,
          "gender": emptyParam,
          "toneShift": emptyParam
        },
        "notes": this.notes
      }],
      "tracks": [{
        "name": "未命名音轨",
        "dispColor": "ff7db235",
        "dispOrder": 0,
        "renderEnabled": false,
        "mixer": {
          "gainDecibel": 0, "pan": 0,
          "mute": false, "solo": false, "display": true
        },
        "mainGroup": {
          "name": "main", "uuid": mainId,
          "parameters": {
            "pitchDelta": emptyParam,
            "vibratoEnv": emptyParam,
            "loudness": emptyParam,
            "tension": emptyParam,
            "breathiness": emptyParam,
            "voicing": emptyParam,
            "gender": emptyParam,
            "toneShift": emptyParam
          },
          "notes": []
        },
        "mainRef": {
          "groupID": mainId,
          "blickOffset": 0, "pitchOffset": 0,
          "isInstrumental": false,
          "database": {
            "name": "", "language": "", "phoneset": "", "backendType": ""
          },
          "dictionary": "",
          "voice": {}
        },
        "groups": [{
          "groupID": libId,
          "blickOffset": 0, "pitchOffset": 0,
          "isInstrumental": false,
          "database": {
            "name": "", "language": "", "phoneset": "", "backendType": ""
          },
          "dictionary": "", "voice": {}
        }]
      }],
      "renderConfig": {
        "destination": "./",
        "filename": "未命名",
        "numChannels": 1,
        "aspirationFormat": "noAspiration",
        "bitDepth": 16,
        "sampleRate": 48000,
        "exportMixDown": true
      }
    }
  }
  toUstx(name?: string) {
    const ustx = YAML.parse(sampleUstx)
    const ratio = 705600000 / 480
    ustx.tempos[0].bpm = this.bpm
    const part = ustx.voice_parts[0]
    part.name = name
    const sampleNote = JSON.stringify(part.notes[0])
    part.notes = this.notes.map(_note => {
      const note = JSON.parse(sampleNote)
      note.lyric = _note.lyrics
      note.tone = _note.pitch
      note.position = floor(_note.onset / ratio)
      note.duration = floor((_note.onset + _note.duration) / ratio) - note.position
      return note
    })
    const { xs, ys } = part.curves[0], { pitchDelta } = this
    let i = 0, len = pitchDelta.length; for (; i < len; i += 2) {
      xs.push(floor(pitchDelta[i] / ratio))
      ys.push(floor(pitchDelta[i + 1]))
    }
    return YAML.stringify(ustx)
  }
}

