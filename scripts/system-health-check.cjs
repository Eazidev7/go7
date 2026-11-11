#!/usr/bin/env node

/**
 * GO7 V2 System Health Check and Troubleshooting
 * 
 * Comprehensive system health check and troubleshooting utility
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class SystemHealthChecker {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async runHealthCheck() {
    log('\n🏥 GO7 V2 SYSTEM HEALTH CHECK', 'bold');
    log('=' .repeat(50), 'cyan');

    await this.checkVendorDashboardIssues();
    await this.checkDeploymentReadiness();
    await this.checkMigrationStatus();
    await this.checkAdminDashboard();
    await this.generateHealthReport();
  }

  async checkVendorDashboardIssues() {
    log('\n🔧 1. VENDOR DASHBOARD TROUBLESHOOTING', 'blue');
    
    // Check 1: Vendor editing paths
    if (fs.existsSync('src/utils/vendorDashboardTroubleshooter.ts')) {
      this.results.passed.push('Vendor dashboard troubleshooter available');
      log('   ✅ Vendor path validation utility created', 'green');
    } else {
      this.results.failed.push('Vendor dashboard troubleshooter missing');
      log('   ❌ Vendor dashboard troubleshooter missing', 'red');
    }

    // Check 2: Firestore rules for V2 products
    if (fs.existsSync('firestore.rules')) {
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      if (rules.includes('vendors/{vendorId}/products') && rules.includes('measurementType')) {
        this.results.passed.push('Firestore rules support V2 vendor products');
        log('   ✅ Firestore rules configured for V2 vendor products', 'green');
      } else {
        this.results.warnings.push('Firestore rules may need V2 vendor product validation');
        log('   ⚠️ Firestore rules may need V2 updates', 'yellow');
      }
    }

    // Check 3: Real-time listeners
    if (fs.existsSync('src/components/VendorProductManagerV2.tsx')) {
      const component = fs.readFileSync('src/components/VendorProductManagerV2.tsx', 'utf8');
      if (component.includes('onSnapshot') && component.includes('vendors/{vendorId}/products')) {
        this.results.passed.push('V2 component uses real-time listeners');
        log('   ✅ Real-time listeners configured for vendor dashboard', 'green');
      } else {
        this.results.warnings.push('V2 component may need real-time listener updates');
        log('   ⚠️ Real-time listeners may need configuration', 'yellow');
      }
    }
  }

  async checkDeploymentReadiness() {
    log('\n🚀 2. DEPLOYMENT READINESS CHECK', 'blue');

    // Check deployment utilities
    const deploymentFiles = [
      'scripts/deployment-checklist.cjs',
      'scripts/deploy-production.cjs',
      'scripts/deploy-staging.cjs'
    ];

    let deploymentReady = true;
    for (const file of deploymentFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`${file} available`);
        log(`   ✅ ${file} created`, 'green');
      } else {
        this.results.failed.push(`${file} missing`);
        log(`   ❌ ${file} missing`, 'red');
        deploymentReady = false;
      }
    }

    if (deploymentReady) {
      log('   🎯 All deployment utilities available', 'cyan');
    }

    // Check migration scripts
    if (fs.existsSync('scripts/migrate_v1_to_v2.cjs') && fs.existsSync('scripts/validate-migration.cjs')) {
      this.results.passed.push('Migration and validation scripts available');
      log('   ✅ Migration scripts ready', 'green');
    } else {
      this.results.warnings.push('Migration scripts may be incomplete');
      log('   ⚠️ Migration scripts may need completion', 'yellow');
    }
  }

  async checkMigrationStatus() {
    log('\n📊 3. MIGRATION STATUS TRACKING', 'blue');

    // Check migration tracking utilities
    if (fs.existsSync('src/utils/migrationStatusTracker.ts')) {
      this.results.passed.push('Migration status tracker available');
      log('   ✅ Migration status tracking system created', 'green');
    } else {
      this.results.failed.push('Migration status tracker missing');
      log('   ❌ Migration status tracker missing', 'red');
    }

    // Check migration dashboard
    if (fs.existsSync('src/components/MigrationStatusDashboard.tsx')) {
      this.results.passed.push('Migration status dashboard available');
      log('   ✅ Migration dashboard component created', 'green');
    } else {
      this.results.failed.push('Migration status dashboard missing');
      log('   ❌ Migration dashboard component missing', 'red');
    }

    // Check if operations collection structure is documented
    if (fs.existsSync('FIRESTORE_V2_STRUCTURE.md')) {
      const docs = fs.readFileSync('FIRESTORE_V2_STRUCTURE.md', 'utf8');
      if (docs.includes('operations/migrations')) {
        this.results.passed.push('Migration tracking structure documented');
        log('   ✅ Migration tracking documented in Firestore structure', 'green');
      } else {
        this.results.warnings.push('Migration tracking structure needs documentation');
        log('   ⚠️ Migration tracking structure needs documentation', 'yellow');
      }
    }
  }

  async checkAdminDashboard() {
    log('\n👑 4. ADMIN DASHBOARD PREVIEW', 'blue');

    // Check admin preview components
    if (fs.existsSync('src/components/AdminMigrationPreview.tsx')) {
      this.results.passed.push('Admin migration preview dashboard available');
      log('   ✅ Admin migration preview dashboard created', 'green');
    } else {
      this.results.failed.push('Admin migration preview dashboard missing');
      log('   ❌ Admin migration preview dashboard missing', 'red');
    }

    // Check admin dashboard styles
    if (fs.existsSync('src/components/AdminMigrationPreview.css')) {
      this.results.passed.push('Admin dashboard styles available');
      log('   ✅ Admin dashboard styles created', 'green');
    } else {
      this.results.warnings.push('Admin dashboard styles missing');
      log('   ⚠️ Admin dashboard styles missing', 'yellow');
    }

    // Check for icon mapping configuration
    if (fs.existsSync('config/icon-map.json')) {
      this.results.passed.push('Icon mapping configuration available');
      log('   ✅ Icon mapping configuration found', 'green');
    } else {
      this.results.warnings.push('Icon mapping configuration not found');
      log('   ⚠️ Consider creating config/icon-map.json for consistent icons', 'yellow');
    }
  }

  async generateHealthReport() {
    log('\n' + '='.repeat(60), 'bold');
    log('🏥 SYSTEM HEALTH REPORT', 'bold');
    log('='.repeat(60), 'bold');

    // Summary statistics
    const total = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const healthScore = Math.round((this.results.passed.length / total) * 100);

    log(`\n📊 Health Score: ${healthScore}%`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');
    log(`   ✅ Passed: ${this.results.passed.length}`, 'green');
    log(`   ⚠️ Warnings: ${this.results.warnings.length}`, 'yellow');
    log(`   ❌ Failed: ${this.results.failed.length}`, 'red');

    // Detailed results
    if (this.results.passed.length > 0) {
      log(`\n✅ PASSED (${this.results.passed.length}):`, 'green');
      this.results.passed.forEach(item => log(`   • ${item}`, 'green'));
    }

    if (this.results.warnings.length > 0) {
      log(`\n⚠️ WARNINGS (${this.results.warnings.length}):`, 'yellow');
      this.results.warnings.forEach(item => log(`   • ${item}`, 'yellow'));
    }

    if (this.results.failed.length > 0) {
      log(`\n❌ FAILED (${this.results.failed.length}):`, 'red');
      this.results.failed.forEach(item => log(`   • ${item}`, 'red'));
    }

    // Recommendations
    log('\n📋 NEXT STEPS:', 'cyan');
    
    if (this.results.failed.length === 0) {
      if (this.results.warnings.length === 0) {
        log('   🎉 System is healthy and ready for production!', 'green');
        log('   📋 Recommended actions:', 'cyan');
        log('     1. Run deployment checklist: node scripts/deployment-checklist.cjs', 'cyan');
        log('     2. Deploy to staging: node scripts/deploy-staging.cjs', 'cyan');
        log('     3. Run migration: node scripts/migrate_v1_to_v2.cjs', 'cyan');
        log('     4. Monitor with admin dashboard', 'cyan');
      } else {
        log('   ✅ System is mostly healthy with minor warnings', 'yellow');
        log('   📋 Recommended actions:', 'cyan');
        log('     1. Address warnings above', 'cyan');
        log('     2. Run deployment checklist', 'cyan');
        log('     3. Proceed with deployment', 'cyan');
      }
    } else {
      log('   🚨 System has critical issues that need attention', 'red');
      log('   📋 Required actions:', 'cyan');
      log('     1. Fix all failed items above', 'cyan');
      log('     2. Re-run this health check', 'cyan');
      log('     3. Address warnings', 'cyan');
      log('     4. Then proceed with deployment', 'cyan');
    }

    // Quick reference commands
    log('\n🛠️ QUICK REFERENCE COMMANDS:', 'cyan');
    log('   Health Check:     node scripts/system-health-check.cjs', 'cyan');
    log('   Deployment Check: node scripts/deployment-checklist.cjs', 'cyan');
    log('   Stage Deploy:     node scripts/deploy-staging.cjs', 'cyan');
    log('   Production:       node scripts/deploy-production.cjs', 'cyan');
    log('   Migration:        node scripts/migrate_v1_to_v2.cjs', 'cyan');
    log('   Validation:       node scripts/validate-migration.cjs', 'cyan');

    // Troubleshooting quick fixes
    log('\n🔧 TROUBLESHOOTING QUICK FIXES:', 'cyan');
    log('   Vendor Dashboard: Check src/utils/vendorDashboardTroubleshooter.ts', 'cyan');
    log('   Migration Issues: Use src/components/MigrationStatusDashboard.tsx', 'cyan');
    log('   Admin Preview:    Use src/components/AdminMigrationPreview.tsx', 'cyan');
    log('   Icon Issues:      Create config/icon-map.json with SVG sprite mapping', 'cyan');

    return this.results.failed.length === 0;
  }
}

// Additional utility functions
function createIconMapConfig() {
  const iconMap = {
    "version": "1.0.0",
    "description": "Icon mapping for GO7 V2 system to ensure consistent icons across components",
    "iconSet": "lucide-react",
    "mappings": {
      "product": "package",
      "addon": "plus-circle", 
      "measurement": "ruler",
      "vendor": "store",
      "cart": "shopping-cart",
      "order": "clipboard-list",
      "upload": "upload-cloud",
      "delete": "trash-2",
      "edit": "edit-2",
      "save": "check-circle",
      "cancel": "x-circle",
      "loading": "loader",
      "error": "alert-circle",
      "success": "check-circle",
      "warning": "alert-triangle",
      "info": "info",
      "settings": "settings",
      "dashboard": "grid",
      "analytics": "bar-chart-3",
      "migration": "database",
      "preview": "eye"
    },
    "categories": {
      "measurement-types": {
        "unit": "package",
        "portion": "utensils", 
        "bundle": "package-2",
        "weight": "weight"
      },
      "nigerian-market": {
        "derica": "bucket",
        "tuber": "apple",
        "bundle": "package-2"
      }
    }
  };

  if (!fs.existsSync('config')) {
    fs.mkdirSync('config', { recursive: true });
  }

  fs.writeFileSync('config/icon-map.json', JSON.stringify(iconMap, null, 2));
  log('✅ Created config/icon-map.json with consistent icon mappings', 'green');
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const checker = new SystemHealthChecker();

  switch (command) {
    case 'health':
    case undefined:
      checker.runHealthCheck().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;
      
    case 'create-icon-config':
      createIconMapConfig();
      break;
      
    case 'help':
      log('\n🛠️ GO7 V2 System Health Check Commands:', 'cyan');
      log('   node scripts/system-health-check.cjs [command]', 'cyan');
      log('', 'reset');
      log('   Commands:', 'cyan');
      log('     health (default)    - Run full system health check', 'cyan');
      log('     create-icon-config  - Create icon mapping configuration', 'cyan');
      log('     help               - Show this help message', 'cyan');
      break;
      
    default:
      log(`❌ Unknown command: ${command}`, 'red');
      log('   Use "help" to see available commands', 'yellow');
      process.exit(1);
  }
}

module.exports = SystemHealthChecker;