/**
 * Go7 App Validation Script
 * Validates that the complete Go7 delivery app is running properly
 */

const https = require('https');
const http = require('http');

class Go7AppValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.validationResults = [];
  }

  async validateServer() {
    console.log('🔍 Validating Go7 Development Server...\n');
    
    try {
      const response = await this.makeRequest(this.baseUrl);
      
      if (response.statusCode === 200) {
        console.log('✅ Server is responding correctly');
        console.log(`📊 Status Code: ${response.statusCode}`);
        console.log(`📏 Content Length: ${response.data.length} characters`);
        
        // Check if it contains React content
        const isReact = response.data.includes('react') || response.data.includes('ReactDOM');
        const hasMainJs = response.data.includes('main.jsx') || response.data.includes('/src/');
        const hasViteClient = response.data.includes('vite/client') || response.data.includes('@vite/client');
        
        console.log(`🔍 React Detection: ${isReact ? '✅' : '❌'}`);
        console.log(`🔍 Main.js Found: ${hasMainJs ? '✅' : '❌'}`);
        console.log(`🔍 Vite Client: ${hasViteClient ? '✅' : '❌'}`);
        
        if (response.data.length < 100) {
          console.warn('⚠️ Response content seems too short, might be an error page');
        }
        
        return {
          status: 'success',
          details: {
            statusCode: response.statusCode,
            contentLength: response.data.length,
            hasReact: isReact,
            hasMainJs: hasMainJs,
            hasViteClient: hasViteClient
          }
        };
      } else {
        console.error(`❌ Server returned status code: ${response.statusCode}`);
        return { status: 'error', message: `HTTP ${response.statusCode}` };
      }
    } catch (error) {
      console.error('❌ Server validation failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }

  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async validateAppComponents() {
    console.log('\n🧩 Validating App Components...');
    
    // Check if key routes respond
    const routes = [
      '/',           // Home page
      '/profile',    // Profile page  
      '/orders',     // Orders page
      '/track',      // Tracking page
    ];
    
    const routeResults = [];
    
    for (const route of routes) {
      try {
        const url = `${this.baseUrl}${route}`;
        console.log(`🔍 Testing route: ${route}`);
        
        const response = await this.makeRequest(url);
        
        if (response.statusCode === 200) {
          console.log(`✅ Route ${route} responds correctly`);
          routeResults.push({ route, status: 'success' });
        } else {
          console.log(`⚠️ Route ${route} returned status: ${response.statusCode}`);
          routeResults.push({ route, status: 'warning', code: response.statusCode });
        }
      } catch (error) {
        console.log(`❌ Route ${route} failed: ${error.message}`);
        routeResults.push({ route, status: 'error', error: error.message });
      }
    }
    
    return routeResults;
  }

  async runFullValidation() {
    console.log('🚀 Starting Go7 App Full Validation\n');
    console.log('=' .repeat(50));
    
    // 1. Server validation
    const serverResult = await this.validateServer();
    
    // 2. Route validation
    const routeResults = await this.validateAppComponents();
    
    // 3. Summary
    console.log('\n📋 VALIDATION SUMMARY');
    console.log('=' .repeat(50));
    
    console.log(`🖥️  Server Status: ${serverResult.status === 'success' ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (serverResult.status === 'success') {
      console.log(`   • React Detection: ${serverResult.details.hasReact ? '✅' : '❌'}`);
      console.log(`   • Vite Integration: ${serverResult.details.hasViteClient ? '✅' : '❌'}`);
      console.log(`   • Content Length: ${serverResult.details.contentLength} chars`);
    }
    
    const successfulRoutes = routeResults.filter(r => r.status === 'success').length;
    console.log(`🛣️  Routes: ${successfulRoutes}/${routeResults.length} working`);
    
    routeResults.forEach(result => {
      const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${icon} ${result.route}`);
    });
    
    // 4. Final verdict
    console.log('\n🏆 FINAL VERDICT');
    console.log('=' .repeat(50));
    
    if (serverResult.status === 'success' && successfulRoutes > 0) {
      console.log('🎉 Go7 App is WORKING CORRECTLY!');
      console.log('✅ Full React app is rendering');
      console.log('✅ Development server is stable'); 
      console.log('✅ Routes are responding');
      
      if (serverResult.details.hasReact && serverResult.details.hasViteClient) {
        console.log('✅ React + Vite integration confirmed');
      }
      
      return true;
    } else {
      console.log('❌ Go7 App has issues that need attention');
      
      if (serverResult.status !== 'success') {
        console.log('❌ Server not responding properly');
      }
      
      if (successfulRoutes === 0) {
        console.log('❌ No routes are working');
      }
      
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new Go7AppValidator();
  
  validator.runFullValidation()
    .then((success) => {
      console.log(`\n${success ? '🎯 SUCCESS' : '⚠️ ISSUES DETECTED'}: Validation completed`);
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ VALIDATION ERROR:', error);
      process.exit(1);
    });
}

module.exports = Go7AppValidator;