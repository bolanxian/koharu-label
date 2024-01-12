
import YAML from 'yaml'
import { call, getFileExt } from '../utils'

const { parseFromString } = DOMParser.prototype
const { serializeToString } = XMLSerializer.prototype
const parser = new DOMParser()
const serializer = new XMLSerializer()

export interface Type {
  reset(): void
  [Symbol.iterator](): IterableIterator<any>
  getLyrics(): string[]
  setLyrics(it: Iterable<string>): void
  setPhonemes(it: Iterable<string>): void
  export(): string
}

export const XML = {
  parse(text: string) {
    return call(parseFromString, parser, text, 'text/xml')
  },
  serialize(data: Node) {
    return call(serializeToString, serializer, data)
  },
  getTextNode(el: Node): CDATASection | Text | null {
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
  },
  setText(el: Node, value: string) {
    const node = XML.getTextNode(el)
    if (node != null) {
      node.data = value
    } else {
      el.textContent = value
    }
  }
}

export abstract class Xml {
  #text: string
  #data: Document; get data() { return this.#data }
  abstract [Symbol.iterator](): IterableIterator<Element>
  constructor(text: string) {
    this.#text = text
    this.#data = XML.parse(text)
  }
  reset() {
    this.#data = XML.parse(this.#text)
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
    return XML.serialize(this.#data)
  }
}

export class Musicxml extends Xml {
  *[Symbol.iterator](): Generator<Element> {
    yield* super.data.querySelectorAll('lyric>text') as any
  }
}

export class Svp {
  static parse(text: string) {
    return JSON.parse(String(text).replace(/\0+$/, ''))
  }
  #text: string
  #data: any
  constructor(text: string) {
    this.#text = text
    this.#data = Svp.parse(text)
  }
  reset() {
    this.#data = Svp.parse(this.#text)
  }
  *[Symbol.iterator]() {
    const data = this.#data
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
    return JSON.stringify(this.#data) + '\0'
  }
}

export class Ustx {
  #text: string
  #data: any
  constructor(text: string) {
    this.#text = text
    this.#data = YAML.parse(text)
  }
  reset() {
    return this.#data = YAML.parse(this.#text)
  }
  *[Symbol.iterator]() {
    const data = this.#data
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
    return YAML.stringify(this.#data)
  }
}

export class Vsqx extends Xml {
  #queryLyrics: string
  #queryPhonemes: string
  constructor(text: string) {
    super(text)
    const { tagName } = super.data.documentElement
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
    yield* super.data.querySelectorAll(isPhoneme ? this.#queryPhonemes : this.#queryLyrics) as any as Element[]
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

export class Ntpj extends Xml {
  *[Symbol.iterator]() {
    yield* super.data.querySelectorAll('Score:root>Notes>Note') as any as Element[]
  }
  getLyrics(): string[] {
    return Array.from(this, el => el.getAttribute('lyric') ?? '')
  }
  setLyrics(_it: Iterable<string>) {
    const it = _it[Symbol.iterator]()
    for (const note of this) {
      const { done, value } = it.next()
      if (done) return
      note.setAttribute('lyric', value)
    }
  }
}

export const getType = (file: File): { new(text: string): Type } | undefined => {
  if (file.name === 'score.xml') {
    return Ntpj
  }
  switch (getFileExt(file)) {
    case 'musicxml': return Musicxml
    case 'svp': return Svp
    case 'ustx': return Ustx
    case 'vsqx': return Vsqx
  }
}