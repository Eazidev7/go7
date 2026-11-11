/**
 * Update VAPID key in .env files
 * Usage: node update-vapid-key.js YOUR_VAPID_KEY
 */

const fs = require('fs');
const path = require('path');

const vapidKey = process.argv[2];

if (!vapidKey) {
  console.error('❌ Error: VAPID key is required');
  console.log('\nUsage: node update-vapid-key.js YOUR_VAPID_KEY');
  console.log('Example: node update-vapid-key.js BKdN7G-QJ8X9YxGQp...');
  process.exit(1);
}

// Validate key format
if (!vapidKey.startsWith('B')) {
  console.error('❌ Error: VAPID key should start with "B"');
  process.exit(1);
}

if (vapidKey.length !== 88) {
  console.error(`❌ Error: VAPID key should be exactly 88 characters (got ${vapidKey.length})`);
  process.exit(1);
}

console.log('✓ VAPID key format looks correct');
console.log(`✓ Length: ${vapidKey.length} characters\n`);

// Update .env file
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

function updateEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${path.basename(filePath)} not found, skipping...`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace or uncomment VAPID key
    const vapidRegex = /^#?\s*VITE_FIREBASE_VAPID_KEY=.*$/m;
    const newVapidLine = `VITE_FIREBASE_VAPID_KEY=${vapidKey}`;
    
    if (vapidRegex.test(content)) {
      content = content.replace(vapidRegex, newVapidLine);
    } else {
      // Add it after messaging sender ID
      content = content.replace(
        /(VITE_FIREBASE_MESSAGING_SENDER_ID=.*)/,
        `$1\n\n# Firebase Cloud Messaging VAPID Key\n${newVapidLine}`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error updating ${path.basename(filePath)}:`, error.message);
  }
}

updateEnvFile(envPath);
updateEnvFile(envLocalPath);

console.log('\n🎉 VAPID key updated successfully!');
console.log('\n⚠️  IMPORTANT: Restart your dev server for changes to take effect');
console.log('   Press Ctrl+C in the dev server terminal and run: npm run dev');
