import { CSVImportService } from '../csvImportService';
import { ResponsiveImageService } from '../responsiveImageService';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  writeBatch: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getFirestore: jest.fn()
}));

// Mock ResponsiveImageService
jest.mock('../responsiveImageService', () => ({
  ResponsiveImageService: {
    uploadProductImage: jest.fn(),
    waitForResizedImages: jest.fn()
  }
}));

// Mock fetch for image copying
global.fetch = jest.fn();

const mockWriteBatch = writeBatch as jest.MockedFunction<typeof writeBatch>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockUploadProductImage = ResponsiveImageService.uploadProductImage as jest.MockedFunction<typeof ResponsiveImageService.uploadProductImage>;
const mockWaitForResizedImages = ResponsiveImageService.waitForResizedImages as jest.MockedFunction<typeof ResponsiveImageService.waitForResizedImages>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CSVImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockWriteBatch.mockReturnValue({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    } as any);
    
    mockCollection.mockReturnValue({} as any);
    mockDoc.mockReturnValue({ id: 'test-doc-id' } as any);
  });

  describe('parseCSVFile', () => {
    it('should parse valid CSV file with all required columns', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        'Test Product,29.99,Electronics,Test description,https://example.com/image.jpg,100,true\n' +
                        'Another Product,15.50,Books,Another description,https://example.com/image2.jpg,50,false';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        title: 'Test Product',
        price: 29.99,
        category: 'Electronics',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        stock: 100,
        available: true,
        rowIndex: 2,
        errors: [],
        warnings: []
      });
      expect(result[1]).toEqual({
        title: 'Another Product',
        price: 15.50,
        category: 'Books',
        description: 'Another description',
        imageUrl: 'https://example.com/image2.jpg',
        stock: 50,
        available: false,
        rowIndex: 3,
        errors: [],
        warnings: []
      });
    });

    it('should handle CSV with quoted values containing commas', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        '"Product, with comma",29.99,"Electronics, Tech","Description, with comma","https://example.com/image.jpg",100,true';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Product, with comma');
      expect(result[0].category).toBe('Electronics, Tech');
      expect(result[0].description).toBe('Description, with comma');
    });

    it('should handle escaped quotes in CSV values', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        '"Product ""Special"" Edition",29.99,Electronics,"Description ""with quotes""","https://example.com/image.jpg",100,true';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Product "Special" Edition');
      expect(result[0].description).toBe('Description "with quotes"');
    });

    it('should throw error for empty CSV file', async () => {
      const file = new File([''], 'empty.csv', { type: 'text/csv' });
      
      await expect(CSVImportService.parseCSVFile(file)).rejects.toThrow('CSV file is empty');
    });

    it('should throw error for missing required columns', async () => {
      const csvContent = 'title,price,category\n' +
                        'Test Product,29.99,Electronics';
      
      const file = new File([csvContent], 'incomplete.csv', { type: 'text/csv' });
      
      await expect(CSVImportService.parseCSVFile(file)).rejects.toThrow(/Missing required columns/);
    });

    it('should validate row data and collect errors', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        ',invalid-price,,"",invalid-url,-5,maybe\n' +
                        'Valid Product,29.99,Electronics,Good description,https://example.com/image.jpg,100,true';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result).toHaveLength(2);
      
      // First row should have errors
      expect(result[0].errors).toContain('Title is required');
      expect(result[0].errors).toContain('Price must be a valid positive number');
      expect(result[0].errors).toContain('Category is required');
      expect(result[0].errors).toContain('Image URL is required');
      expect(result[0].errors).toContain('Stock must be a valid non-negative number');
      expect(result[0].errors).toContain('Available must be true/false or yes/no or 1/0');
      
      // Second row should be valid
      expect(result[1].errors).toHaveLength(0);
    });

    it('should generate warnings for edge cases', async () => {
      const longTitle = 'A'.repeat(101);
      const longDescription = 'B'.repeat(1001);
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        `"${longTitle}",150000,Electronics,"${longDescription}",https://example.com/image.jpg,15000,true`;
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result[0].warnings).toContain('Title is very long (>100 characters)');
      expect(result[0].warnings).toContain('Price is very high (>100,000)');
      expect(result[0].warnings).toContain('Description is very long (>1000 characters)');
      expect(result[0].warnings).toContain('Stock is very high (>10,000)');
    });

    it('should skip empty rows', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        'Product 1,29.99,Electronics,Description,https://example.com/image.jpg,100,true\n' +
                        '\n' +
                        '   \n' +
                        'Product 2,15.50,Books,Description,https://example.com/image2.jpg,50,false';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Product 1');
      expect(result[1].title).toBe('Product 2');
    });

    it('should handle different boolean formats for available field', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        'Product 1,29.99,Electronics,Description,https://example.com/image.jpg,100,true\n' +
                        'Product 2,29.99,Electronics,Description,https://example.com/image.jpg,100,false\n' +
                        'Product 3,29.99,Electronics,Description,https://example.com/image.jpg,100,1\n' +
                        'Product 4,29.99,Electronics,Description,https://example.com/image.jpg,100,0\n' +
                        'Product 5,29.99,Electronics,Description,https://example.com/image.jpg,100,yes\n' +
                        'Product 6,29.99,Electronics,Description,https://example.com/image.jpg,100,no\n' +
                        'Product 7,29.99,Electronics,Description,https://example.com/image.jpg,100,';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result[0].available).toBe(true);
      expect(result[1].available).toBe(false);
      expect(result[2].available).toBe(true);
      expect(result[3].available).toBe(false);
      expect(result[4].available).toBe(true);
      expect(result[5].available).toBe(false);
      expect(result[6].available).toBe(true); // default to true for empty
    });
  });

  describe('createImportPreview', () => {
    it('should create preview with valid and invalid rows', () => {
      const parsedRows = [
        {
          title: 'Valid Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Description',
          imageUrl: 'https://example.com/image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        },
        {
          title: '',
          price: 0,
          category: '',
          description: '',
          imageUrl: '',
          stock: 0,
          available: true,
          rowIndex: 3,
          errors: ['Title is required', 'Category is required'],
          warnings: []
        },
        {
          title: 'Another Valid Product',
          price: 15.50,
          category: 'Books',
          description: 'Description',
          imageUrl: 'https://example.com/image2.jpg',
          stock: 50,
          available: false,
          rowIndex: 4,
          errors: [],
          warnings: []
        }
      ];

      const preview = CSVImportService.createImportPreview(parsedRows);

      expect(preview.totalRows).toBe(3);
      expect(preview.validRows).toHaveLength(2);
      expect(preview.invalidRows).toHaveLength(1);
      expect(preview.estimatedBatches).toBe(1); // 2 valid rows, batch size is 10
    });

    it('should calculate correct number of batches', () => {
      const validRows = Array(25).fill(null).map((_, index) => ({
        title: `Product ${index}`,
        price: 29.99,
        category: 'Electronics',
        description: 'Description',
        imageUrl: 'https://example.com/image.jpg',
        stock: 100,
        available: true,
        rowIndex: index + 2,
        errors: [],
        warnings: []
      }));

      const preview = CSVImportService.createImportPreview(validRows);

      expect(preview.estimatedBatches).toBe(3); // 25 rows / 10 batch size = 3 batches
    });
  });

  describe('importProducts', () => {
    beforeEach(() => {
      // Setup mocks for successful import
      mockUploadProductImage.mockResolvedValue({
        original: 'https://storage.googleapis.com/uploaded-image.jpg',
        large: 'https://storage.googleapis.com/uploaded-image_1200x1200.jpg',
        medium: 'https://storage.googleapis.com/uploaded-image_600x600.jpg',
        small: 'https://storage.googleapis.com/uploaded-image_300x300.jpg',
        webp: {
          large: 'https://storage.googleapis.com/uploaded-image_1200x1200.webp',
          medium: 'https://storage.googleapis.com/uploaded-image_600x600.webp',
          small: 'https://storage.googleapis.com/uploaded-image_300x300.webp'
        }
      });
      mockWaitForResizedImages.mockResolvedValue({
        original: 'https://storage.googleapis.com/resized-image.jpg',
        large: 'https://storage.googleapis.com/resized-image_1200x1200.jpg',
        medium: 'https://storage.googleapis.com/resized-image_600x600.jpg',
        small: 'https://storage.googleapis.com/resized-image_300x300.jpg',
        webp: {
          large: 'https://storage.googleapis.com/resized-image_1200x1200.webp',
          medium: 'https://storage.googleapis.com/resized-image_600x600.webp',
          small: 'https://storage.googleapis.com/resized-image_300x300.webp'
        }
      });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/jpeg' }))
      } as any);
    });

    it('should import valid products successfully', async () => {
      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://example.com/image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should call progress callback during import', async () => {
      const validRows = Array(5).fill(null).map((_, index) => ({
        title: `Product ${index}`,
        price: 29.99,
        category: 'Electronics',
        description: 'Description',
        imageUrl: 'https://example.com/image.jpg',
        stock: 100,
        available: true,
        rowIndex: index + 2,
        errors: [],
        warnings: []
      }));

      const progressCallback = jest.fn();

      await CSVImportService.importProducts('vendor-123', validRows, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(5, 5);
    });

    it('should handle image copying failures gracefully', async () => {
      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://example.com/image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      // Mock fetch failure
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      // Should continue with original URL even if image copying fails
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });

    it('should handle batch processing errors', async () => {
      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://example.com/image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      // Mock batch commit failure
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error('Firestore error'))
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toBe('Firestore error');
    });

    it('should process products in batches', async () => {
      const validRows = Array(25).fill(null).map((_, index) => ({
        title: `Product ${index}`,
        price: 29.99,
        category: 'Electronics',
        description: 'Description',
        imageUrl: 'https://example.com/image.jpg',
        stock: 100,
        available: true,
        rowIndex: index + 2,
        errors: [],
        warnings: []
      }));

      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };
      mockWriteBatch.mockReturnValue(mockBatch as any);

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      // Should be called 3 times for 3 batches (25 items / 10 batch size)
      expect(mockWriteBatch).toHaveBeenCalledTimes(3);
      expect(result.totalProcessed).toBe(25);
      expect(result.successCount).toBe(25);
    });
  });

  describe('image copying functionality', () => {
    it('should copy external image to Firebase Storage', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      } as any);

      mockUploadProductImage.mockResolvedValue({
        original: 'https://storage.googleapis.com/uploaded-image.jpg',
        large: 'https://storage.googleapis.com/uploaded-image_1200x1200.jpg',
        medium: 'https://storage.googleapis.com/uploaded-image_600x600.jpg',
        small: 'https://storage.googleapis.com/uploaded-image_300x300.jpg',
        webp: {
          large: 'https://storage.googleapis.com/uploaded-image_1200x1200.webp',
          medium: 'https://storage.googleapis.com/uploaded-image_600x600.webp',
          small: 'https://storage.googleapis.com/uploaded-image_300x300.webp'
        }
      });

      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://external.com/image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      await CSVImportService.importProducts('vendor-123', validRows);

      expect(mockFetch).toHaveBeenCalledWith('https://external.com/image.jpg');
      expect(mockUploadProductImage).toHaveBeenCalled();
      expect(mockWaitForResizedImages).toHaveBeenCalled();
    });

    it('should reject images that are too large', async () => {
      const largeBlob = new Blob([new ArrayBuffer(6 * 1024 * 1024)], { type: 'image/jpeg' }); // 6MB
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(largeBlob)
      } as any);

      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://external.com/large-image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      // Should continue with original URL even if image copying fails
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });

    it('should handle failed image fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://external.com/missing-image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      // Should continue with original URL even if image copying fails
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });

    it('should handle resized image timeout gracefully', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      } as any);

      mockUploadProductImage.mockResolvedValue({
        original: 'https://storage.googleapis.com/uploaded-image.jpg',
        large: 'https://storage.googleapis.com/uploaded-image_1200x1200.jpg',
        medium: 'https://storage.googleapis.com/uploaded-image_600x600.jpg',
        small: 'https://storage.googleapis.com/uploaded-image_300x300.jpg',
        webp: {
          large: 'https://storage.googleapis.com/uploaded-image_1200x1200.webp',
          medium: 'https://storage.googleapis.com/uploaded-image_600x600.webp',
          small: 'https://storage.googleapis.com/uploaded-image_300x300.webp'
        }
      });

      mockWaitForResizedImages.mockRejectedValue(new Error('Timeout'));

      const validRows = [
        {
          title: 'Test Product',
          price: 29.99,
          category: 'Electronics',
          description: 'Test description',
          imageUrl: 'https://external.com/image.jpg',
          stock: 100,
          available: true,
          rowIndex: 2,
          errors: [],
          warnings: []
        }
      ];

      const result = await CSVImportService.importProducts('vendor-123', validRows);

      // Should succeed even if resizing times out
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });
  });

  describe('utility methods', () => {
    it('should generate sample CSV content', () => {
      const csvContent = CSVImportService.generateSampleCSV();
      
      expect(csvContent).toContain('title,price,category,description,imageUrl,stock,available');
      expect(csvContent).toContain('Sample Product 1');
      expect(csvContent).toContain('Sample Product 2');
      expect(csvContent).toContain('Sample Product 3');
    });

    it('should download sample CSV file', () => {
      // Mock window.URL and document methods
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:url');
      const mockRevokeObjectURL = jest.fn();
      const mockClick = jest.fn();
      const mockCreateElement = jest.fn().mockReturnValue({
        href: '',
        download: '',
        click: mockClick
      });

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL
        }
      });

      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement
      });

      CSVImportService.downloadSampleCSV();

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('URL validation', () => {
    it('should validate valid URLs', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        'Test Product,29.99,Electronics,Description,https://example.com/image.jpg,100,true\n' +
                        'Test Product 2,29.99,Electronics,Description,http://example.com/image.jpg,100,true\n' +
                        'Test Product 3,29.99,Electronics,Description,ftp://example.com/image.jpg,100,true';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result[0].errors).not.toContain('Invalid image URL format');
      expect(result[1].errors).not.toContain('Invalid image URL format');
      expect(result[2].errors).not.toContain('Invalid image URL format');
    });

    it('should reject invalid URLs', async () => {
      const csvContent = 'title,price,category,description,imageUrl,stock,available\n' +
                        'Test Product,29.99,Electronics,Description,not-a-url,100,true\n' +
                        'Test Product 2,29.99,Electronics,Description,just-text,100,true';
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await CSVImportService.parseCSVFile(file);
      
      expect(result[0].errors).toContain('Invalid image URL format');
      expect(result[1].errors).toContain('Invalid image URL format');
    });
  });
});