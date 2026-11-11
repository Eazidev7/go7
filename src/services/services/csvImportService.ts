import { collection, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Product } from '../types/marketplace';
import { ResponsiveImageService } from './responsiveImageService';

export interface CSVProductRow {
  title: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  stock: number;
  available: boolean;
}

export interface ParsedCSVRow extends CSVProductRow {
  rowIndex: number;
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  validRows: ParsedCSVRow[];
  invalidRows: ParsedCSVRow[];
  totalRows: number;
  estimatedBatches: number;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string }>;
}

export class CSVImportService {
  private static readonly BATCH_SIZE = 500; // Firestore batch limit
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly REQUIRED_COLUMNS = ['title', 'price', 'category', 'description', 'imageUrl', 'stock', 'available'];

  /**
   * Parse CSV file and return structured data
   */
  static async parseCSVFile(file: File): Promise<ParsedCSVRow[]> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit');
    }

    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const header = this.parseCSVLine(lines[0]);
    const columnMap = this.validateAndMapColumns(header);

    // Parse data rows
    const parsedRows: ParsedCSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const rowData = this.parseCSVLine(lines[i]);
      if (rowData.length === 0) continue; // Skip empty rows

      const parsedRow = this.parseRow(rowData, columnMap, i + 1);
      parsedRows.push(parsedRow);
    }

    return parsedRows;
  }

  /**
   * Validate parsed data and create import preview
   */
  static createImportPreview(parsedRows: ParsedCSVRow[]): ImportPreview {
    const validRows = parsedRows.filter(row => row.errors.length === 0);
    const invalidRows = parsedRows.filter(row => row.errors.length > 0);

    return {
      validRows,
      invalidRows,
      totalRows: parsedRows.length,
      estimatedBatches: Math.ceil(validRows.length / this.BATCH_SIZE)
    };
  }

  /**
   * Import products in batches with image processing
   */
  static async importProducts(
    vendorId: string,
    validRows: ParsedCSVRow[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Process in batches
    const batches = this.createBatches(validRows, this.BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        await this.processBatch(vendorId, batch, result);
        
        if (onProgress) {
          onProgress(result.totalProcessed, validRows.length);
        }
      } catch (error) {
        console.error(`Error processing batch ${batchIndex + 1}:`, error);
        result.success = false;
        
        // Mark all items in this batch as errors
        batch.forEach(row => {
          result.errors.push({
            row: row.rowIndex,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.errorCount++;
        });
      }
    }

    return result;
  }

  /**
   * Parse a single CSV line (handles quoted values with commas)
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  }

  /**
   * Validate CSV header and create column mapping
   */
  private static validateAndMapColumns(header: string[]): Map<string, number> {
    const columnMap = new Map<string, number>();
    const normalizedHeader = header.map(col => col.toLowerCase().trim());

    // Check for required columns
    const missingColumns: string[] = [];
    
    for (const requiredCol of this.REQUIRED_COLUMNS) {
      const index = normalizedHeader.indexOf(requiredCol.toLowerCase());
      if (index === -1) {
        missingColumns.push(requiredCol);
      } else {
        columnMap.set(requiredCol, index);
      }
    }

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    return columnMap;
  }

  /**
   * Parse and validate a single row
   */
  private static parseRow(rowData: string[], columnMap: Map<string, number>, rowIndex: number): ParsedCSVRow {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract values based on column mapping
    const getValue = (column: string): string => {
      const index = columnMap.get(column);
      return index !== undefined && index < rowData.length ? rowData[index].trim() : '';
    };

    // Parse and validate title
    const title = getValue('title');
    if (!title) {
      errors.push('Title is required');
    } else if (title.length > 100) {
      warnings.push('Title is very long (>100 characters)');
    }

    // Parse and validate price
    const priceStr = getValue('price');
    let price = 0;
    if (!priceStr) {
      errors.push('Price is required');
    } else {
      price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) {
        errors.push('Price must be a valid positive number');
      } else if (price > 100000) {
        warnings.push('Price is very high (>100,000)');
      }
    }

    // Parse and validate category
    const category = getValue('category');
    if (!category) {
      errors.push('Category is required');
    }

    // Parse description
    const description = getValue('description');
    if (!description) {
      warnings.push('Description is empty');
    } else if (description.length > 1000) {
      warnings.push('Description is very long (>1000 characters)');
    }

    // Parse and validate imageUrl
    const imageUrl = getValue('imageUrl');
    if (!imageUrl) {
      errors.push('Image URL is required');
    } else if (!this.isValidUrl(imageUrl)) {
      errors.push('Invalid image URL format');
    }

    // Parse and validate stock
    const stockStr = getValue('stock');
    let stock = 0;
    if (!stockStr) {
      errors.push('Stock is required');
    } else {
      stock = parseInt(stockStr);
      if (isNaN(stock) || stock < 0) {
        errors.push('Stock must be a valid non-negative number');
      } else if (stock > 10000) {
        warnings.push('Stock is very high (>10,000)');
      }
    }

    // Parse and validate available
    const availableStr = getValue('available').toLowerCase();
    let available = true;
    if (availableStr && !['true', 'false', '1', '0', 'yes', 'no'].includes(availableStr)) {
      errors.push('Available must be true/false or yes/no or 1/0');
    } else {
      available = ['true', '1', 'yes'].includes(availableStr) || (!availableStr && true);
    }

    return {
      title,
      price,
      category,
      description,
      imageUrl,
      stock,
      available,
      rowIndex,
      errors,
      warnings
    };
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create batches from array
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a single batch of products
   */
  private static async processBatch(
    vendorId: string,
    batch: ParsedCSVRow[],
    result: ImportResult
  ): Promise<void> {
    const firestoreBatch = writeBatch(db);
    const productsCollection = collection(db, `vendors/${vendorId}/products`);

    for (const row of batch) {
      try {
        // Process image URL - copy to Firebase Storage
        let processedImageUrl = row.imageUrl;
        
        if (row.imageUrl && this.isValidUrl(row.imageUrl)) {
          try {
            processedImageUrl = await this.copyImageToStorage(vendorId, row.imageUrl, row.title);
          } catch (imageError) {
            console.warn(`Failed to copy image for row ${row.rowIndex}:`, imageError);
            // Continue with original URL
          }
        }

        // Create product document
        const productDoc = doc(productsCollection);
        const productData: Omit<Product, 'id'> = {
          vendorId,
          title: row.title,
          price: row.price,
          category: row.category,
          desc: row.description,
          imageUrl: processedImageUrl,
          stock: row.stock,
          available: row.available,
          createdAt: new Date(),
          // Default values for other fields
          hasVariants: false,
          variants: undefined,
          productOptions: undefined,
          options: undefined
        };

        firestoreBatch.set(productDoc, productData);
        result.successCount++;
      } catch (error) {
        console.error(`Error preparing product for row ${row.rowIndex}:`, error);
        result.errors.push({
          row: row.rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.errorCount++;
      }

      result.totalProcessed++;
    }

    // Commit the batch
    await firestoreBatch.commit();
  }

  /**
   * Copy external image to Firebase Storage with responsive resizing
   */
  private static async copyImageToStorage(
    vendorId: string,
    imageUrl: string,
    productTitle: string
  ): Promise<string> {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Check file size (max 5MB for product images)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Image file too large (>5MB)');
      }

      // Convert blob to File for ResponsiveImageService
      const sanitizedTitle = productTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const extension = this.getFileExtensionFromBlob(blob) || 'jpg';
      const filename = `${Date.now()}_${sanitizedTitle}.${extension}`;
      const file = new File([blob], filename, { type: blob.type });

      // Use ResponsiveImageService for automatic resizing
      const result = await ResponsiveImageService.uploadProductImage(file, vendorId);
      
      // Wait for resized images to be generated (with timeout)
      try {
        await ResponsiveImageService.waitForResizedImages(result.storageRefPaths, 10000);
      } catch (waitError) {
        console.warn('Timeout waiting for resized images, continuing with base image:', waitError);
        // Continue with base image if resizing times out
      }
      
      return result.url;
    } catch (error) {
      console.error('Error copying image to storage:', error);
      throw error;
    }
  }

  /**
   * Get file extension from blob type
   */
  private static getFileExtensionFromBlob(blob: Blob): string | null {
    const type = blob.type;
    if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
    if (type.includes('png')) return 'png';
    if (type.includes('gif')) return 'gif';
    if (type.includes('webp')) return 'webp';
    return null;
  }

  /**
   * Generate sample CSV content for download
   */
  static generateSampleCSV(): string {
    const headers = this.REQUIRED_COLUMNS.join(',');
    const sampleRows = [
      '"Sample Product 1",29.99,"Electronics","High-quality electronic device","https://example.com/image1.jpg",100,true',
      '"Sample Product 2",15.50,"Books","Educational book for beginners","https://example.com/image2.jpg",50,true',
      '"Sample Product 3",99.99,"Clothing","Premium cotton t-shirt","https://example.com/image3.jpg",25,false'
    ];
    
    return [headers, ...sampleRows].join('\n');
  }

  /**
   * Download sample CSV file
   */
  static downloadSampleCSV(): void {
    const csvContent = this.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-sample.csv';
    a.click();
    
    window.URL.revokeObjectURL(url);
  }
}
