/**
 * Mock yauzl-promise module to replace yauzl-promise
 * This prevents build errors when the ZIP file reader is not needed in browser
 */

// Mock yauzl-promise functions
export async function open(zipFilePath, options) {
  console.warn('yauzl-promise.open is not supported in browser environment');
  return null;
}

export async function fromBuffer(buffer, options) {
  console.warn('yauzl-promise.fromBuffer is not supported in browser environment');
  return null;
}

export async function fromFd(fd, options) {
  console.warn('yauzl-promise.fromFd is not supported in browser environment');
  return null;
}

export async function fromRandomAccessReader(reader, totalSize, options) {
  console.warn('yauzl-promise.fromRandomAccessReader is not supported in browser environment');
  return null;
}

export default {
  open,
  fromBuffer,
  fromFd,
  fromRandomAccessReader
};
