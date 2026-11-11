/**
 * Jest Test Setup
 * 
 * Global test configuration and mocks
 */

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve({ 
          exists: false,
          data: () => ({})
        })),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve())
      })),
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ 
          docs: [],
          empty: true
        }))
      }))
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve())
    }))
  };

  const mockStorage = {
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        copy: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
        exists: jest.fn(() => Promise.resolve([true])),
        getSignedUrl: jest.fn(() => Promise.resolve(['https://example.com/signed-url']))
      }))
    }))
  };

  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: jest.fn(() => mockFirestore),
    storage: jest.fn(() => mockStorage),
    credential: {
      cert: jest.fn(),
      applicationDefault: jest.fn()
    },
    FieldValue: {
      serverTimestamp: jest.fn(() => ({ _methodName: 'FieldValue.serverTimestamp' })),
      arrayUnion: jest.fn((items) => ({ _methodName: 'FieldValue.arrayUnion', _elements: items })),
      arrayRemove: jest.fn((items) => ({ _methodName: 'FieldValue.arrayRemove', _elements: items }))
    }
  };
});

// Mock UUID generation for consistent testing
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Setup test timeout
jest.setTimeout(10000);
