/**
 * Mock CRC32 module to replace @node-rs/crc32-wasm32-wasi
 * This prevents build errors when the WASM module is not available
 */

// Simple CRC32 implementation for browser
export function crc32(data) {
  // Basic polyfill - returns a simple hash
  if (typeof data === 'string') {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  return 0;
}

export default {
  crc32
};
