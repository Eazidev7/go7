// Direct Firebase removal using REST API
// This bypasses the need for admin credentials

import fetch from 'node-fetch';

const FIREBASE_PROJECT_ID = 'go7-delivery';
const VENDOR_ID = 'fW4EoEvkVpPmNtIMmNYit06xrl02';

async function removeVendorViaREST() {
  try {
    console.log('🗑️ Attempting to remove vendor via Firebase REST API...');
    
    // Try to delete the vendor document directly
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/vendors/${VENDOR_ID}`;
    
    console.log(`🌐 DELETE URL: ${deleteUrl}`);
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Vendor deleted successfully via REST API!');
      console.log('🔄 Please refresh your mobile page to see the changes.');
    } else {
      console.log('❌ REST API deletion failed:', response.status, response.statusText);
      console.log('📄 Response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Error with REST API approach:', error);
  }
}

removeVendorViaREST();