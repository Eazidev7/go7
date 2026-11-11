import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Go7 Development Server with Mobile Support...');

// Set the working directory - use the current directory
const cwd = __dirname;
console.log(`Working directory: ${cwd}`);

// Check if vite.config.js exists and has proper configuration
const viteConfigPath = path.join(cwd, 'vite.config.js');

if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  // Check if historyApiFallback is properly configured
  if (!viteConfig.includes('historyApiFallback: true')) {
    console.log('\nWarning: historyApiFallback not found in vite.config.js');
    console.log('This may cause issues with client-side routing, including mobile routes.');
    console.log('Consider running fix-mobile-routing.ps1 to update the configuration.\n');
  } else {
    console.log('✓ SPA routing configuration detected in vite.config.js');
  }
}

// Check if mobile access guide exists, and if not, notify the user
const mobileAccessGuidePath = path.join(cwd, 'MOBILE_ACCESS_GUIDE.md');
if (!fs.existsSync(mobileAccessGuidePath)) {
  console.log('\nNote: MOBILE_ACCESS_GUIDE.md not found.');
  console.log('Run fix-mobile-routing.ps1 to generate this file with mobile access instructions.\n');
} else {
  console.log('✓ Mobile access guide available: MOBILE_ACCESS_GUIDE.md');
}

// Start server with mobile-focused configuration
const args = ['run', 'dev'];

// Add open flag to automatically open browser
args.push('--open');

// Spawn the npm process
const npmProcess = spawn('npm', args, { 
  cwd,
  shell: true,
  stdio: 'inherit'
});

// Handle process events
npmProcess.on('error', (error) => {
  console.error(`Error starting server: ${error.message}`);
});

npmProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Display helpful information for mobile testing
setTimeout(() => {
  console.log('\n====== MOBILE TESTING INFORMATION ======');
  console.log('To access the mobile homepage:');
  console.log('1. Direct URL: http://localhost:5173/mobile');
  console.log('2. Helper page: http://localhost:5173/direct-mobile.html');
  console.log('3. Root redirect: http://localhost:5173/mobile.html');
  console.log('\nTo test mobile detection, resize browser to < 768px width');
  console.log('========================================\n');
}, 5000);