/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module 'ipinyinjs/dict/pinyin_dict_withtone' { }
declare module 'ipinyinjs/pinyinUtil' { }
interface Window {
  showDirectoryPicker(opts?: any): Promise<FileSystemDirectoryHandle>
}
interface Console {
  exception(...args: any[]): void
}
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}
interface FileSystemWritableFileStream extends WritableStream {
  seek(): Promise<void>
  truncate(): Promise<void>
  write(data: BlobPart): Promise<void>
}