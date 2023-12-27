
import YAML from 'yaml'
import { call } from '../utils'
import table, { reg as romajiReg } from './table?table-reg'
import reverseTable, { reg as reverseRomajiReg } from './table?table-reg&reverse'

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

export abstract class TypeAsText {
  static async loadAsFile<T extends TypeAsText>(this: { new(text: string): T }, file: Blob): Promise<T> {
    return new this(await file.text())
  }
  text: string
  constructor(text: string) {
    this.text = text
    this.reset()
  }
  abstract reset(): void
  abstract [Symbol.iterator](): IterableIterator<any>
  abstract getLyrics(): string[]
  abstract setLyrics(_it: Iterable<string>): void
  abstract setPhonemes(_it: Iterable<string>): void
  abstract export(): string
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
    if (node != null && node === el.lastChild) {
      const type = node.nodeType
      if (type === Node.CDATA_SECTION_NODE) {
        return node as CDATASection
      }
      if (type === Node.TEXT_NODE) {
        return node as Text
      }
    }
    return null
  }
  static setText(el: Node, value: string) {
    const node = XML.getTextNode(el)
    if (node != null) {
      node.data = value
    } else {
      el.textContent = value
    }
  }
  declare data: Document
  abstract [Symbol.iterator](): IterableIterator<Element>
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
      XML.setText(note, value)
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
  ustx: class extends TypeAsText {
    declare data: any
    reset() {
      return this.data = YAML.parse(this.text)
    }
    *[Symbol.iterator]() {
      const { data } = this
      for (const part of data.voice_parts) {
        yield* part.notes
      }
    }
    getLyrics(): string[] {
      return Array.from(this, n => n.lyric)
    }
    setLyrics(_it: Iterable<string>) {
      const it = _it[Symbol.iterator]()
      for (const note of this) {
        const { done, value } = it.next()
        if (done) return
        note.lyric = value
      }
    }
    setPhonemes(_it: Iterable<string>) {
      const it = _it[Symbol.iterator]()
      for (const note of this) {
        const { done, value } = it.next()
        if (done) return
        note.phoneme_overrides = [{ index: 0, phoneme: value }]
      }
    }
    export() {
      return YAML.stringify(this.data)
    }
  },
  musicxml: class extends XML {
    *[Symbol.iterator](): Generator<Element> {
      yield* this.data.querySelectorAll('lyric>text') as any
    }
  },
  vsqx: class extends XML {
    #queryLyrics: string
    #queryPhonemes: string
    constructor(text: string) {
      super(text)
      const { tagName } = this.data.documentElement
      switch (tagName) {
        case 'vsq4':
          this.#queryLyrics = 'note>y'
          this.#queryPhonemes = 'note>p'
          break
        case 'vsq3':
          this.#queryLyrics = 'note>lyric'
          this.#queryPhonemes = 'note>phnms'
          break
        default:
          throw new TypeError(`Unknown vsqx file: <${tagName}>`)
      }
    }
    *[Symbol.iterator](isPhoneme = false) {
      yield* this.data.querySelectorAll(isPhoneme ? this.#queryPhonemes : this.#queryLyrics) as any as Element[]
    }
    setPhonemes(_it: Iterable<string>) {
      const it = _it[Symbol.iterator]()
      for (const note of this.data.querySelectorAll(this.#queryPhonemes) as any as Element[]) {
        const { done, value } = it.next()
        if (done) return
        XML.setText(note, value)
      }
    }
  }
}
export type Types = typeof types
export type CtorTypes = Types[keyof Types]
export type InstTypes = InstanceType<CtorTypes>
