
export class IteratorSource<R>{
  iterator: Iterator<R> | AsyncIterator<R>
  constructor(iterator: IteratorSource<R>['iterator']) {
    this.iterator = iterator
  }
  async pull(controller: ReadableStreamController<R>) {
    try {
      const result = await this.iterator.next()
      result.done ? controller.close() : controller.enqueue(await result.value)
    } catch (error) {
      try {
        await this.iterator.return?.()
      } finally {
        throw error
      }
    }
  }
  async cancel() {
    await this.iterator.return?.()
  }
}
export class ReadableIterator<R>{
  reader: ReturnType<ReadableStream<R>['getReader']>
  constructor(readable: ReadableStream<R>) {
    this.reader = readable.getReader()
  }
  next(): Promise<IteratorResult<R, void>> { return this.reader.read() as any }
  async return(): Promise<IteratorReturnResult<void>> {
    await this.reader.cancel()
    return { done: true, value: void 0 }
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<R> { return this }
}
export class IteratorStream<T>{
  static from<T>(it: IteratorSource<T>['iterator'], strategy?: QueuingStrategy<T>) {
    return new this(new ReadableStream(new IteratorSource(it), strategy))
  }
  readable: ReadableStream<T>
  constructor(readable: ReadableStream<T>) {
    this.readable = readable
  }
  pipe<R>(gen: (that: this) => Generator<R> | AsyncGenerator<R>, strategy?: QueuingStrategy<R>): IteratorStream<R> {
    return IteratorStream.from(gen(this), strategy)
  }
  [Symbol.asyncIterator]() { return new ReadableIterator(this.readable) }
}
export default IteratorStream