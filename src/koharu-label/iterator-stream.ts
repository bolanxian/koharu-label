type ForAwait<T> = (Iterable<T> | AsyncIterable<T>) & Partial<Iterable<T> & AsyncIterable<T>>
export class IterableSource<R> implements UnderlyingSource<R>{
  iterator: Iterator<R> | AsyncIterator<R>
  constructor(iterable: ForAwait<R>) {
    this.iterator = iterable[Symbol.asyncIterator]?.() ?? iterable[Symbol.iterator]!()
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
  preventCancel: boolean
  constructor(readable: ReadableStream<R>, options?: StreamPipeOptions) {
    this.preventCancel = options?.preventCancel ?? false
    this.reader = readable.getReader()
  }
  next(): Promise<IteratorResult<R, void>> { return this.reader.read() as any }
  async return(): Promise<IteratorReturnResult<void>> {
    if (!this.preventCancel) { await this.reader.cancel() }
    return { done: true, value: void 0 }
  }
  declare [Symbol.asyncIterator]: () => this
}
ReadableIterator.prototype[Symbol.asyncIterator] = (async function* () { }).prototype[Symbol.asyncIterator]
export class IterableStream<T>{
  static from<T>(iterable: ForAwait<T>, strategy?: QueuingStrategy<T>) {
    return new this(new ReadableStream(new IterableSource(iterable), strategy))
  }
  readable: ReadableStream<T>
  constructor(readable: ReadableStream<T>) {
    this.readable = readable
  }
  pipe<R>(gen: (that: this) => ForAwait<R>, strategy?: QueuingStrategy<R>): IterableStream<R> {
    return IterableStream.from(gen(this), strategy)
  }
  values(options?: StreamPipeOptions) { return new ReadableIterator(this.readable, options) }
  declare [Symbol.asyncIterator]: this['values']
}
IterableStream.prototype[Symbol.asyncIterator] = IterableStream.prototype.values
{
  const { values } = (ReadableStream as any).prototype
  if (typeof values === 'function') {
    const source: any = {
      values(options?: StreamPipeOptions) {
        return values.call(this.readable, options)
      }
    }
    source[Symbol.asyncIterator] = source.values
    Object.assign(IterableStream.prototype, source)
  }
}
export default IterableStream