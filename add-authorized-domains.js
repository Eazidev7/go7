// Script to add authorized domains to Firebase Authentication
// Uses Firebase Admin SDK to programmatically update project settings

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Domains to add
const DOMAINS_TO_ADD = [
  'localhost',
  '127.0.0.1',
  'go7.ng',
  'www.go7.ng'
];

async function addAuthorizedDomains() {
  try {
    // Check if service account file exists
    const serviceAccountPath = path.join(__dirname, 'service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Error: service-account.json not found!');
      console.log('\n📋 How to create service account:');
      console.log('1. Go to: https://console.firebase.google.com/project/go7-delivery/settings/serviceaccounts/adminsdk');
      console.log('2. Click "Generate new private key"');
      console.log('3. Download the JSON file');
      console.log('4. Save it as "service-account.json" in this directory:');
      console.log(`   ${__dirname}`);
      console.log('\n⚠️ IMPORTANT: Add service-account.json to .gitignore to keep it secure!');
      process.exit(1);
    }

    // Initialize Firebase Admin
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'go7-delivery'
    });

    console.log('✅ Firebase Admin initialized successfully');
    console.log(`📋 Project ID: ${serviceAccount.project_id}\n`);

    // Note: Firebase Admin SDK doesn't directly support updating authorized domains
    // We need to use the Firebase Management API (REST API) instead
    console.log('⚠️ Firebase Admin SDK limitation detected');
    console.log('📝 Switching to Firebase Management REST API...\n');

    // Get access token from service account
    const auth = new GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }

    console.log('🔑 Access token obtained\n');

    // Get current authorized domains using REST API
    const projectId = serviceAccount.project_id;
    const apiUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get current config: ${response.status} - ${errorData}`);
    }

    const currentConfig = await response.json();
    const currentDomains = currentConfig.authorizedDomains || [];

    console.log('📋 Current authorized domains:');
    currentDomains.forEach(domain => console.log(`   - ${domain}`));
    console.log('');

    // Add new domains (avoid duplicates)
    const updatedDomains = [...new Set([...currentDomains, ...DOMAINS_TO_ADD])];
    const newDomains = updatedDomains.filter(d => !currentDomains.includes(d));

    if (newDomains.length === 0) {
      console.log('✅ All domains are already authorized!');
      return;
    }

    console.log('➕ Adding new domains:');
    newDomains.forEach(domain => console.log(`   + ${domain}`));
    console.log('');

    // Update authorized domains
    const updateResponse = await fetch(apiUrl + '?updateMask=authorizedDomains', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authorizedDomains: updatedDomains
      })
    });

    if (!updateResponse.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to update domains: ${updateResponse.status} - ${errorData}`);
    }

    const updatedConfig = await updateResponse.json();

    console.log('✅ Authorized domains updated successfully!\n');
    console.log('📋 Updated authorized domains:');
    updatedConfig.authorizedDomains.forEach(domain => console.log(`   ✓ ${domain}`));
    console.log('');
    console.log('🎉 Done! You can now test authentication at: http://localhost:8080/auth-test');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
addAuthorizedDomains();
