/**
 * Mock archiver module
 * Prevents errors when zip/archive functionality is not needed in browser
 */

class ArchiverMock {
  constructor(format, options) {
    console.warn('archiver is not supported in browser environment');
    this.format = format;
    this.options = options;
  }

  append(source, data) {
    console.warn('archiver.append() called but not implemented in browser');
    return this;
  }

  file(source, data) {
    console.warn('archiver.file() called but not implemented in browser');
    return this;
  }

  directory(dirpath, destpath, data) {
    console.warn('archiver.directory() called but not implemented in browser');
    return this;
  }

  glob(pattern, options) {
    console.warn('archiver.glob() called but not implemented in browser');
    return this;
  }

  finalize() {
    console.warn('archiver.finalize() called but not implemented in browser');
    return Promise.resolve();
  }

  pipe(destination) {
    console.warn('archiver.pipe() called but not implemented in browser');
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

  pointer() {
    return 0;
  }
}

// Factory function (default export)
export default function archiver(format, options) {
  console.warn('archiver() called - creating mock archiver instance');
  return new ArchiverMock(format, options);
}

// Named exports for compatibility
export { ArchiverMock };
export const create = archiver;
