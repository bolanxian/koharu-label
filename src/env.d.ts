/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
interface Window {
  showDirectoryPicker(opts?: any): Promise<FileSystemDirectoryHandle>
}
interface Console{
  exception(...args:any[]):void
}
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}
interface FileSystemWritableFileStream extends WritableStream {
  seek():Promise<void>
  truncate():Promise<void>
  write(data:BlobPart):Promise<void>
}