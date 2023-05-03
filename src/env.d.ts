/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module '*?markdown' {
  const html: string
  export default html
}
declare module '*?table-reg' {
  const reg: RegExp
  export default reg
}
declare module 'ipinyinjs/pinyinUtil' {
  export const pinyinUtil: {
    getPinyin(chinese: string, splitter: string, withtone: boolean, polyphone: boolean): string
  }
}
interface Window {
  showDirectoryPicker(opts?: any): Promise<FileSystemDirectoryHandle>
}
interface Console {
  exception(...args: any[]): void
}
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}
interface FileSystemWritableFileStream extends WritableStream<Uint8Array> {
  seek(): Promise<void>
  truncate(): Promise<void>
  write(data: BlobPart): Promise<void>
}
interface ImportMetaEnv {

}
interface ImportMeta {
  readonly env: ImportMetaEnv
}