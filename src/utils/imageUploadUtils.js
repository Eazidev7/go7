const EXTENSION_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
};

export function resolveImageContentType(file) {
  if (!file) return 'image/jpeg';

  const declared = typeof file.type === 'string' ? file.type.trim() : '';
  if (declared && declared.startsWith('image/')) {
    return declared;
  }

  const name = typeof file.name === 'string' ? file.name : '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return EXTENSION_MIME[ext] || 'image/jpeg';
}
