/**
 * Mock readable-stream module
 * Provides browser-compatible stream implementations
 */

// Simple Readable stream implementation
export class Readable {
  constructor(options = {}) {
    console.warn('readable-stream.Readable is not fully supported in browser environment');
    this.options = options;
    this._readableState = {
      ended: false,
      destroyed: false
    };
  }

  push(chunk) {
    console.warn('Readable.push() called but not implemented');
    return false;
  }

  pipe(destination) {
    console.warn('Readable.pipe() called but not implemented');
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

  destroy() {
    this._readableState.destroyed = true;
  }
}

// Simple Writable stream implementation
export class Writable {
  constructor(options = {}) {
    console.warn('readable-stream.Writable is not fully supported in browser environment');
    this.options = options;
  }

  write(chunk, encoding, callback) {
    if (callback) callback();
    return true;
  }

  end(chunk, encoding, callback) {
    if (callback) callback();
  }

  on(event, handler) {
    return this;
  }
}

// Simple Transform stream implementation
export class Transform extends Readable {
  constructor(options = {}) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    if (callback) callback();
  }
}

// Simple Duplex stream implementation
export class Duplex extends Readable {
  constructor(options = {}) {
    super(options);
  }
}

// Simple PassThrough stream implementation
export class PassThrough extends Transform {
  constructor(options = {}) {
    super(options);
  }
}

// Stream utility
export class Stream {
  constructor() {
    console.warn('readable-stream.Stream is not fully supported in browser environment');
  }
}

// Default export
export default {
  Readable,
  Writable,
  Transform,
  Duplex,
  PassThrough,
  Stream
};
