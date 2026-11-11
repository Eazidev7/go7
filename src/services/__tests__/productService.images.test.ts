import { ProductService } from '../productService';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase/config';

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../../firebase/config', () => ({
  storage: {},
}));

describe('ProductService - Image Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImages', () => {
    it('should successfully upload multiple images and return URLs', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const mockFile1 = new File(['image1'], 'image1.jpg', { type: 'image/jpeg' });
      const mockFile2 = new File(['image2'], 'image2.png', { type: 'image/png' });
      const files = [mockFile1, mockFile2];

      const mockStorageRef1 = { name: 'image1.jpg' };
      const mockStorageRef2 = { name: 'image2.png' };
      const mockUploadResult1 = { ref: mockStorageRef1 };
      const mockUploadResult2 = { ref: mockStorageRef2 };

      (ref as jest.Mock)
        .mockReturnValueOnce(mockStorageRef1)
        .mockReturnValueOnce(mockStorageRef2);
      
      (uploadBytes as jest.Mock)
        .mockResolvedValueOnce(mockUploadResult1)
        .mockResolvedValueOnce(mockUploadResult2);
      
      (getDownloadURL as jest.Mock)
        .mockResolvedValueOnce('https://example.com/image1.jpg')
        .mockResolvedValueOnce('https://example.com/image2.png');

      // Act
      const result = await ProductService.uploadImages(vendorId, files);

      // Assert
      expect(result).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.png'
      ]);
      expect(ref).toHaveBeenCalledTimes(2);
      expect(uploadBytes).toHaveBeenCalledTimes(2);
      expect(getDownloadURL).toHaveBeenCalledTimes(2);
    });

    it('should handle single file upload', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const files = [mockFile];

      const mockStorageRef = { name: 'test.jpg' };
      const mockUploadResult = { ref: mockStorageRef };

      (ref as jest.Mock).mockReturnValue(mockStorageRef);
      (uploadBytes as jest.Mock).mockResolvedValue(mockUploadResult);
      (getDownloadURL as jest.Mock).mockResolvedValue('https://example.com/test.jpg');

      // Act
      const result = await ProductService.uploadImages(vendorId, files);

      // Assert
      expect(result).toEqual(['https://example.com/test.jpg']);
      expect(ref).toHaveBeenCalledWith(
        storage,
        expect.stringMatching(/^products\/vendor123\/\d+_test\.jpg$/)
      );
    });

    it('should generate unique filenames with timestamps', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const files = [mockFile];

      const mockStorageRef = { name: 'test.jpg' };
      const mockUploadResult = { ref: mockStorageRef };

      (ref as jest.Mock).mockReturnValue(mockStorageRef);
      (uploadBytes as jest.Mock).mockResolvedValue(mockUploadResult);
      (getDownloadURL as jest.Mock).mockResolvedValue('https://example.com/test.jpg');

      // Mock Date.now to return consistent value
      const mockTimestamp = 1640995200000; // 2022-01-01
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Act
      await ProductService.uploadImages(vendorId, files);

      // Assert
      expect(ref).toHaveBeenCalledWith(
        storage,
        `products/vendor123/${mockTimestamp}_test.jpg`
      );
    });

    it('should throw error when upload fails', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const files = [mockFile];

      (ref as jest.Mock).mockReturnValue({});
      (uploadBytes as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      // Act & Assert
      await expect(ProductService.uploadImages(vendorId, files)).rejects.toThrow('Upload failed');
    });

    it('should handle empty files array', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const files: File[] = [];

      // Act
      const result = await ProductService.uploadImages(vendorId, files);

      // Assert
      expect(result).toEqual([]);
      expect(ref).not.toHaveBeenCalled();
      expect(uploadBytes).not.toHaveBeenCalled();
      expect(getDownloadURL).not.toHaveBeenCalled();
    });
  });

  describe('deleteImages', () => {
    it('should successfully delete multiple images', async () => {
      // Arrange
      const imageUrls = [
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fvendor123%2Fimage1.jpg?alt=media',
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fvendor123%2Fimage2.png?alt=media'
      ];

      const mockStorageRef1 = { name: 'image1.jpg' };
      const mockStorageRef2 = { name: 'image2.png' };

      (ref as jest.Mock)
        .mockReturnValueOnce(mockStorageRef1)
        .mockReturnValueOnce(mockStorageRef2);
      
      (deleteObject as jest.Mock).mockResolvedValue(undefined);

      // Act
      await ProductService.deleteImages(imageUrls);

      // Assert
      expect(ref).toHaveBeenCalledTimes(2);
      expect(ref).toHaveBeenCalledWith(storage, 'products/vendor123/image1.jpg');
      expect(ref).toHaveBeenCalledWith(storage, 'products/vendor123/image2.png');
      expect(deleteObject).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid URLs gracefully', async () => {
      // Arrange
      const imageUrls = [
        'invalid-url',
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fvendor123%2Fvalid.jpg?alt=media'
      ];

      const mockStorageRef = { name: 'valid.jpg' };
      (ref as jest.Mock).mockReturnValue(mockStorageRef);
      (deleteObject as jest.Mock).mockResolvedValue(undefined);

      // Spy on console.warn to verify error logging
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      await ProductService.deleteImages(imageUrls);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deleting image invalid-url:',
        expect.any(Error)
      );
      expect(ref).toHaveBeenCalledTimes(1); // Only called for valid URL
      expect(deleteObject).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should continue deletion even if individual delete fails', async () => {
      // Arrange
      const imageUrls = [
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fvendor123%2Fimage1.jpg?alt=media',
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fvendor123%2Fimage2.jpg?alt=media'
      ];

      const mockStorageRef1 = { name: 'image1.jpg' };
      const mockStorageRef2 = { name: 'image2.jpg' };

      (ref as jest.Mock)
        .mockReturnValueOnce(mockStorageRef1)
        .mockReturnValueOnce(mockStorageRef2);
      
      (deleteObject as jest.Mock)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      await ProductService.deleteImages(imageUrls);

      // Assert
      expect(deleteObject).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting image'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty URLs array', async () => {
      // Arrange
      const imageUrls: string[] = [];

      // Act
      await ProductService.deleteImages(imageUrls);

      // Assert
      expect(ref).not.toHaveBeenCalled();
      expect(deleteObject).not.toHaveBeenCalled();
    });

    it('should extract correct file path from Firebase URL', async () => {
      // Arrange
      const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/mybucket/o/products%2Fvendor123%2F1640995200000_test.jpg?alt=media&token=abc123';
      
      const mockStorageRef = { name: 'test.jpg' };
      (ref as jest.Mock).mockReturnValue(mockStorageRef);
      (deleteObject as jest.Mock).mockResolvedValue(undefined);

      // Act
      await ProductService.deleteImages([imageUrl]);

      // Assert
      expect(ref).toHaveBeenCalledWith(
        storage,
        'products/vendor123/1640995200000_test.jpg'
      );
    });
  });

  describe('Image operations integration', () => {
    it('should handle upload then delete workflow', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const files = [mockFile];

      // Setup upload mocks
      const mockStorageRef = { name: 'test.jpg' };
      const mockUploadResult = { ref: mockStorageRef };
      const uploadedUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fvendor123%2Ftest.jpg?alt=media';

      (ref as jest.Mock).mockReturnValue(mockStorageRef);
      (uploadBytes as jest.Mock).mockResolvedValue(mockUploadResult);
      (getDownloadURL as jest.Mock).mockResolvedValue(uploadedUrl);
      (deleteObject as jest.Mock).mockResolvedValue(undefined);

      // Act - Upload then delete
      const uploadResult = await ProductService.uploadImages(vendorId, files);
      await ProductService.deleteImages(uploadResult);

      // Assert
      expect(uploadResult).toEqual([uploadedUrl]);
      expect(uploadBytes).toHaveBeenCalledTimes(1);
      expect(deleteObject).toHaveBeenCalledTimes(1);
    });
  });
});