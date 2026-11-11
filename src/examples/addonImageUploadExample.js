// Example usage of the addon image upload system
import { uploadAddonWithImage, createAddonWithoutImage, generateAddonId, validateImageFile, validateAddonData } from '../services/addonImageUpload';

// Example 1: Upload addon with image
async function exampleUploadWithImage() {
  const fileInput = document.getElementById('imageInput');
  const imageFile = fileInput.files[0];
  
  // Validate file first
  const fileValidation = validateImageFile(imageFile);
  if (!fileValidation.valid) {
    console.error('File validation failed:', fileValidation.errors);
    return;
  }
  
  // Prepare addon data
  const addonData = {
    name: 'Extra Chicken Breast',
    price: 1500,
    description: 'Grilled chicken breast with herbs',
    category: 'protein',
    unitType: 'piece',
    inStock: true
  };
  
  // Validate addon data
  const dataValidation = validateAddonData(addonData);
  if (!dataValidation.valid) {
    console.error('Data validation failed:', dataValidation.errors);
    return;
  }
  
  try {
    const result = await uploadAddonWithImage({
      vendorId: 'current-vendor-id', // Must match authenticated user ID
      addonId: generateAddonId(),
      imageFile: imageFile,
      addonData: addonData,
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress.progress.toFixed(1)}%`);
        // Update UI progress bar here
      }
    });
    
    console.log('✅ Upload successful!');
    console.log('Original image:', result.imageUrl);
    console.log('Thumbnail:', result.thumbUrl);
    console.log('Addon data:', result.addonData);
    
    // Update UI with new addon
    displayAddon(result);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    // Show error to user
  }
}

// Example 2: Create addon without image
async function exampleCreateWithoutImage() {
  const addonData = {
    name: 'Spicy Sauce',
    price: 200,
    description: 'Hot and spicy dipping sauce',
    category: 'condiment',
    unitType: 'bottle',
    inStock: true
  };
  
  try {
    const result = await createAddonWithoutImage({
      vendorId: 'current-vendor-id',
      addonId: generateAddonId(),
      addonData: addonData
    });
    
    console.log('✅ Addon created!');
    console.log('Addon data:', result.addonData);
    
    // Update UI with new addon
    displayAddon(result);
    
  } catch (error) {
    console.error('❌ Creation failed:', error.message);
  }
}

// Example 3: Real-time listener for vendor addons
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

function setupAddonListener(vendorId) {
  const db = getFirestore();
  const addonsRef = collection(db, `vendors/${vendorId}/addons`);
  const q = query(addonsRef, orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const addons = [];
    snapshot.forEach((doc) => {
      addons.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📋 Addons updated:', addons.length);
    
    // Update UI with all addons
    displayAddons(addons);
  });
  
  return unsubscribe; // Call this to stop listening
}

// Example 4: Complete form with validation
function setupAddonForm() {
  const form = document.getElementById('addonForm');
  const fileInput = document.getElementById('imageInput');
  const progressBar = document.getElementById('progressBar');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const addonData = {
      name: formData.get('name'),
      price: parseFloat(formData.get('price')),
      description: formData.get('description'),
      category: formData.get('category'),
      unitType: formData.get('unitType') || 'piece',
      inStock: formData.get('inStock') === 'on'
    };
    
    const imageFile = fileInput.files[0];
    
    try {
      let result;
      
      if (imageFile) {
        // Upload with image
        result = await uploadAddonWithImage({
          vendorId: getCurrentVendorId(),
          addonId: generateAddonId(),
          imageFile: imageFile,
          addonData: addonData,
          onProgress: (progress) => {
            progressBar.style.width = `${progress.progress}%`;
            progressBar.textContent = `${Math.round(progress.progress)}%`;
          }
        });
      } else {
        // Create without image
        result = await createAddonWithoutImage({
          vendorId: getCurrentVendorId(),
          addonId: generateAddonId(),
          addonData: addonData
        });
      }
      
      // Reset form and show success
      form.reset();
      progressBar.style.width = '0%';
      showSuccessMessage('Addon created successfully!');
      
    } catch (error) {
      showErrorMessage(error.message);
    }
  });
}

// Helper functions (implement these based on your UI framework)
function displayAddon(addon) {
  // Add addon to UI
  console.log('Display addon:', addon);
}

function displayAddons(addons) {
  // Update UI with all addons
  console.log('Display all addons:', addons);
}

function getCurrentVendorId() {
  // Return current authenticated vendor ID
  return 'vendor-123'; // Replace with actual implementation
}

function showSuccessMessage(message) {
  // Show success notification
  console.log('✅', message);
}

function showErrorMessage(message) {
  // Show error notification  
  console.error('❌', message);
}

// Initialize the system
document.addEventListener('DOMContentLoaded', () => {
  // Setup form handler
  setupAddonForm();
  
  // Setup real-time listener
  const vendorId = getCurrentVendorId();
  if (vendorId) {
    const unsubscribe = setupAddonListener(vendorId);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', unsubscribe);
  }
});