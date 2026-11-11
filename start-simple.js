// Simple server startup script
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Go7 Simple Development Server...');

// Set the working directory
const cwd = __dirname;
console.log(`Working directory: ${cwd}`);

// Use the simple vite config with a specific port
const npmProcess = spawn('npx', ['vite', '--config', 'vite.config.simple.js', '--port', '8000'], { 
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