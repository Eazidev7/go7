// 🚀 AUTO-RUN PRODUCT MIGRATION ON APP START
// This script automatically migrates products when the app loads

import { migrateProductsToGlobal } from './migrateProductsToGlobal.js';

const MIGRATION_KEY = 'go7_migration_v2_completed';

export const autoMigrateProducts = async () => {
  // Check if migration already ran (optional - remove to force re-run)
  const migrationDone = localStorage.getItem(MIGRATION_KEY);
  
  if (migrationDone) {
    console.log('⏭️ Migration already completed. Clear localStorage to re-run.');
    return { skipped: true };
  }
  
  try {
    console.log('🔄 Auto-migrating products to global collection...');
    const result = await migrateProductsToGlobal();
    
    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
    
    console.log('✅ Auto-migration complete:', result);
    return result;
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
    throw error;
  }
};

// Force immediate migration - expose to window for manual trigger
if (typeof window !== 'undefined') {
  window.autoMigrateProducts = autoMigrateProducts;
  window.forceMigration = () => {
    localStorage.removeItem(MIGRATION_KEY);
    return autoMigrateProducts();
  };
  
  // Auto-run on import (wait for Firebase)
  setTimeout(() => {
    autoMigrateProducts().catch(console.error);
  }, 1000);
}
