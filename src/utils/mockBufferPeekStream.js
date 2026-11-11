/**
 * Mock buffer-peek-stream module
 * This prevents build errors when buffer streaming is not needed in browser
 */

class BufferPeekStream {
  constructor(stream, peekBytes) {
    console.warn('buffer-peek-stream is not supported in browser environment');
    this.stream = stream;
    this.peekBytes = peekBytes;
  }

  peek(callback) {
    if (callback) {
      callback(null, Buffer.alloc(0), null);
    }
    return this;
  }

  pipe(destination) {
    return destination;
  }

  on(event, handler) {
    return this;
  }

  once(event, handler) {
    return this;
  }

  emit(event, ...args) {
    return false;
  }
}

// Default export
export default function bufferPeekStream(stream, peekBytes) {
  console.warn('buffer-peek-stream.default() is not supported in browser environment');
  return new BufferPeekStream(stream, peekBytes);
}

// Named export compatibility
export { BufferPeekStream };
