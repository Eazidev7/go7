/**
 * Import Batcher - Fixes connection reset issues with large number of imports
 * This utility helps manage dynamic imports to prevent overwhelming the dev server
 */

// Batch size for dynamic imports to prevent connection overload
const IMPORT_BATCH_SIZE = 10;
const IMPORT_DELAY = 50; // ms between batches

class ImportBatcher {
  constructor() {
    this.importQueue = [];
    this.processing = false;
  }

  // Add import to queue
  queueImport(importFunction, fallback = null) {
    return new Promise((resolve, reject) => {
      this.importQueue.push({
        importFunction,
        fallback,
        resolve,
        reject
      });
      
      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  // Process imports in batches
  async processBatch() {
    this.processing = true;
    
    while (this.importQueue.length > 0) {
      const batch = this.importQueue.splice(0, IMPORT_BATCH_SIZE);
      
      // Process current batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          const result = await item.importFunction();
          item.resolve(result);
        } catch (error) {
          console.warn('Import failed, using fallback:', error.message);
          item.resolve(item.fallback || (() => <div>Component loading...</div>));
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to prevent connection overload
      if (this.importQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, IMPORT_DELAY));
      }
    }
    
    this.processing = false;
  }
}

// Global instance
const importBatcher = new ImportBatcher();

/**
 * Safe dynamic import that prevents connection overload
 * @param {Function} importFunction - The import function (e.g., () => import('./Component'))
 * @param {Component} fallback - Fallback component if import fails
 * @returns {Promise} Promise that resolves to the imported component
 */
export const safeImport = (importFunction, fallback = null) => {
  return importBatcher.queueImport(importFunction, fallback);
};

/**
 * Create a lazy component with connection-safe import
 * @param {Function} importFunction - The import function
 * @param {Component} fallback - Fallback component
 * @returns {React.Component} Lazy component
 */
export const createSafeLazy = (importFunction, fallback = null) => {
  return React.lazy(() => safeImport(importFunction, fallback));
};

export default importBatcher;