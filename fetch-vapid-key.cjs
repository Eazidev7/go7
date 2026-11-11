/**
 * Script to fetch VAPID key from Firebase Console programmatically
 * This will guide you through getting the correct VAPID key
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase VAPID Key Setup\n');
console.log('This script will help you get the correct VAPID key from Firebase.\n');

// Read current .env file
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

console.log('📋 INSTRUCTIONS:');
console.log('═'.repeat(60));
console.log('1. Open Firebase Console: https://console.firebase.google.com');
console.log('2. Select project: go7-delivery');
console.log('3. Click ⚙️ (Settings) → Project settings');
console.log('4. Go to "Cloud Messaging" tab');
console.log('5. Scroll to "Web Push certificates" section');
console.log('6. If no key exists, click "Generate key pair"');
console.log('7. Copy the key pair value (starts with "B" and is 88 characters)\n');
console.log('═'.repeat(60));

console.log('\n📊 Current Configuration:');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const vapidMatch = envContent.match(/VITE_FIREBASE_VAPID_KEY=(.+)/);
  
  if (vapidMatch && vapidMatch[1] && !vapidMatch[1].startsWith('#')) {
    const currentKey = vapidMatch[1].trim();
    console.log(`✓ VAPID Key found: ${currentKey.substring(0, 20)}...`);
    console.log(`✓ Length: ${currentKey.length} characters`);
    
    if (currentKey.length === 88) {
      console.log('✓ Length is correct (88 characters)');
    } else {
      console.log(`⚠️  Length is incorrect (should be 88, got ${currentKey.length})`);
    }
  } else {
    console.log('⚠️  VAPID Key is commented out or missing');
  }
} catch (error) {
  console.log('❌ Error reading .env file:', error.message);
}

console.log('\n🔑 Firebase Project Details:');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const projectId = envContent.match(/VITE_FIREBASE_PROJECT_ID=(.+)/)?.[1]?.trim();
  const senderId = envContent.match(/VITE_FIREBASE_MESSAGING_SENDER_ID=(.+)/)?.[1]?.trim();
  
  console.log(`Project ID: ${projectId}`);
  console.log(`Sender ID: ${senderId}`);
  console.log(`\nDirect Link: https://console.firebase.google.com/project/${projectId}/settings/cloudmessaging`);
} catch (error) {
  console.log('Could not read project details');
}

console.log('\n\n📝 TO UPDATE THE KEY:');
console.log('═'.repeat(60));
console.log('After copying the key from Firebase Console, run:');
console.log('\nNode.js (this terminal):');
console.log('  node update-vapid-key.js YOUR_KEY_HERE');
console.log('\nPowerShell:');
console.log('  $key = "YOUR_KEY_HERE"');
console.log('  node update-vapid-key.js $key');
console.log('═'.repeat(60));

// Create the update script
const updateScriptContent = `/**
 * Update VAPID key in .env files
 * Usage: node update-vapid-key.js YOUR_VAPID_KEY
 */

const fs = require('fs');
const path = require('path');

const vapidKey = process.argv[2];

if (!vapidKey) {
  console.error('❌ Error: VAPID key is required');
  console.log('\\nUsage: node update-vapid-key.js YOUR_VAPID_KEY');
  console.log('Example: node update-vapid-key.js BKdN7G-QJ8X9YxGQp...');
  process.exit(1);
}

// Validate key format
if (!vapidKey.startsWith('B')) {
  console.error('❌ Error: VAPID key should start with "B"');
  process.exit(1);
}

if (vapidKey.length !== 88) {
  console.error(\`❌ Error: VAPID key should be exactly 88 characters (got \${vapidKey.length})\`);
  process.exit(1);
}

console.log('✓ VAPID key format looks correct');
console.log(\`✓ Length: \${vapidKey.length} characters\\n\`);

// Update .env file
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

function updateEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(\`⚠️  \${path.basename(filePath)} not found, skipping...\`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace or uncomment VAPID key
    const vapidRegex = /^#?\\s*VITE_FIREBASE_VAPID_KEY=.*$/m;
    const newVapidLine = \`VITE_FIREBASE_VAPID_KEY=\${vapidKey}\`;
    
    if (vapidRegex.test(content)) {
      content = content.replace(vapidRegex, newVapidLine);
    } else {
      // Add it after messaging sender ID
      content = content.replace(
        /(VITE_FIREBASE_MESSAGING_SENDER_ID=.*)/,
        \`$1\\n\\n# Firebase Cloud Messaging VAPID Key\\n\${newVapidLine}\`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(\`✓ Updated \${path.basename(filePath)}\`);
  } catch (error) {
    console.error(\`❌ Error updating \${path.basename(filePath)}:\`, error.message);
  }
}

updateEnvFile(envPath);
updateEnvFile(envLocalPath);

console.log('\\n🎉 VAPID key updated successfully!');
console.log('\\n⚠️  IMPORTANT: Restart your dev server for changes to take effect');
console.log('   Press Ctrl+C in the dev server terminal and run: npm run dev');
`;

fs.writeFileSync(path.join(__dirname, 'update-vapid-key.js'), updateScriptContent);
console.log('\n✓ Created update-vapid-key.js helper script\n');
