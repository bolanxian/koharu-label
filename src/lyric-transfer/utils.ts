
import table from './table'
const { fromCharCode } = String
const { charCodeAt, replace } = String.prototype
type ReplacerList = [RegExp, string | ((substring: string, ...args: any[]) => string)][]
const replacer = (list: ReplacerList) => {
  const fn = (str: string) => {
    for (const a of fn.map) {
      str = replace.call(str, a[0], a[1] as any)
    }
    return str
  }
  fn.map = new Map(list)
  return fn
}
const replacerShort = (list: ReplacerList) => {
  const fn = (str: string) => {
    for (const a of fn.map) {
      const s = replace.call(str, a[0], a[1] as any)
      if (s !== str) { return s }
      str = s
    }
    return str
  }
  fn.map = new Map(list)
  return fn
}
const romajiReg = RegExp(Object.keys(table).sort((a, b) => b.length - a.length).join('|'), 'g')
export const romaji = {
  table,
  reg: romajiReg,
  toHiragana: replacer([[
    romajiReg,
    m => {
      const s = table[m as keyof typeof table]
      return s != null ? s.split(',', 1)[0] : m
    }
  ]]),
  toKatakana: replacer([[
    romajiReg,
    m => {
      const s = table[m as keyof typeof table]
      return s != null ? s.split(',', 2)[1] : m
    }
  ]])
}
const createCharCodeOffset = (reg: RegExp, i: number) => {
  const cb = (m: string) => fromCharCode(charCodeAt.call(m, 0) + i)
  return replacer([[reg, cb]])
}
export const utils = {
  replacer,
  replacerShort,
  toHiragana: createCharCodeOffset(/[\u30a1-\u30f6]/g, -0x60),//カタカナをひらがなに変換する関数
  toKatakana: createCharCodeOffset(/[\u3041-\u3096]/g, 0x60),//ひらがなをカタカナに変換する関数
  download(sequence: string | BlobPart[] | Blob, filename = ''): void {
    const a = document.createElement('a')
    a.download = filename
    if (typeof sequence === 'string') {
      a.href = sequence
    } else {
      const blob = (sequence instanceof Blob) ? sequence : new Blob(sequence)
      const src = a.href = URL.createObjectURL(blob)
      setTimeout(() => { URL.revokeObjectURL(src) }, 60000)
    }
    a.click()
  }
}
abstract class TypeAsText {
  static async loadAsFile<T extends typeof TypeAsText>(file: Blob): Promise<InstanceType<T>> {
    return new (this as any)(await file.text()) as InstanceType<T>
  }
  text: string
  abstract reset(): void
  constructor(text: string) {
    this.text = text
    this.reset()
  }
}
abstract class XML extends TypeAsText {
  static parser = new DOMParser()
  static serializer = new XMLSerializer()
  static parse(text: string) {
    return this.parser.parseFromString(text, "text/xml")
  }
  static serialize(data: Node) {
    return this.serializer.serializeToString(data)
  }
  static craeteEmptyDocument() {
    return this.parse('<?xml version="1.0" encoding="UTF-8"?><root></root>')
  }
  static getTextNode(el: Node): CDATASection | Text | null {
    const node = el.firstChild
    if (
      node && node === el.lastChild &&
      (node.nodeType === Node.CDATA_SECTION_NODE || node.nodeType === Node.TEXT_NODE)
    ) {
      return node as any
    }
    return null
  }
  declare data: Document
  abstract [Symbol.iterator](): Generator<Element>
  reset() {
    return this.data = XML.parse(this.text)
  }
  getLyrics(): string[] {
    return Array.from(this, el => el.textContent ?? '')
  }
  setLyrics(_it: Iterable<string>) {
    const it = _it[Symbol.iterator]()
    for (const note of this) {
      const { done, value } = it.next()
      if (done) return
      const node = XML.getTextNode(note)
      if (node) {
        node.data = value
      } else {
        note.textContent = value
      }
    }
  }
  setPhonemes(_it: Iterable<string>) { }
  export() {
    return XML.serialize(this.data)
  }
}
export const types = {
  svp: class extends TypeAsText {
    declare data: any
    reset() {
      return this.data = JSON.parse(this.text.replace(/\0+$/, ''))
    }
    *[Symbol.iterator]() {
      const { data } = this
      for (const track of data.tracks) {
        yield* track.mainGroup.notes
      }
      for (const lib of data.library) {
        yield* lib.notes
      }
    }
    getLyrics(): string[] {
      return Array.from(this, n => n.lyrics)
    }
    setLyrics(_it: Iterable<string>) {
      const it = _it[Symbol.iterator]()
      for (const note of this) {
        const { done, value } = it.next()
        if (done) return
        note.lyrics = value
      }
    }
    setPhonemes(_it: Iterable<string>) {
      const it = _it[Symbol.iterator]()
      for (const note of this) {
        const { done, value } = it.next()
        if (done) return
        note.phonemes = value
      }
    }
    export() {
      return JSON.stringify(this.data) + '\0'
    }
  },
  musicxml: class extends XML {
    *[Symbol.iterator](): Generator<Element> {
      yield* this.data.querySelectorAll('lyric>text') as any
    }
  },
  vsqx: class extends XML {
    *[Symbol.iterator](): Generator<Element> {
      yield* this.data.querySelectorAll('note>y') as any
    }
  }
}
