/**
 * 📦 AI Package Detection Component
 * Upload package image → AI analyzes → Returns size/weight/vehicle recommendation
 */

import React, { useState, useRef } from 'react';
import { Upload, Camera, Package, Loader, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';
import { auth, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { uploadVendorImagePreferHostinger } from '../services/hostingerImageUpload';
import './PackageDetection.css';

const PackageDetection = ({ onSelect, bookingData }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [manualOverride, setManualOverride] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  // Analyze package using AI
  const analyzePackage = async () => {
    if (!image) {
      toast.error('Please upload a package image first');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error('Please sign in to use AI package detection');
      return;
    }

    setAnalyzing(true);

    try {
      // Hostinger only (Firebase Storage bypass)
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const imageUrl = await uploadVendorImagePreferHostinger(
        image,
        `package-detection/${user.uid}/${Date.now()}_${safeName}`
      );

      console.log('📤 Image uploaded:', imageUrl);

      // 2. Call Cloud Function to analyze with AI
      const analyzePackageImage = httpsCallable(functions, 'analyzePackageImage');
      
      const response = await analyzePackageImage({
        imageUrl,
        bookingData: {
          pickupAddress: bookingData?.pickupAddress || '',
          deliveryAddress: bookingData?.deliveryAddress || '',
          distance: bookingData?.distance || 0
        }
      });

      console.log('🤖 AI Analysis:', response.data);

      if (response.data.success) {
        const analysis = response.data.analysis;
        setResult(analysis);
        
        // Auto-select only genuine, high-confidence AI results.
        if (!analysis.fallback && analysis.confidence >= 80 && onSelect) {
          onSelect(analysis);
        }

        if (analysis.fallback) {
          setManualOverride(true);
          toast('AI is unavailable; please verify the suggested package details.', {
            icon: '⚠️',
          });
        } else {
          toast.success('Package analyzed successfully! 📦');
        }
      } else {
        throw new Error(response.data.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('❌ Analysis error:', error);
      const code = String(error?.code || '');
      const message = code.includes('storage/unauthorized')
        ? 'Package photo upload was not authorized. Please sign in again.'
        : code.includes('unauthenticated')
          ? 'Please sign in again to use AI package detection.'
          : 'AI package detection is temporarily unavailable. Please select the package size manually.';
      toast.error(message);
      
      // Fallback to manual selection
      setManualOverride(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Manual override
  const handleManualOverride = (field, value) => {
    setResult(prev => ({
      ...prev,
      [field]: value,
      manualOverride: true
    }));
  };

  // Confirm selection
  const confirmSelection = () => {
    if (result && onSelect) {
      onSelect(result);
      toast.success('Package details confirmed! ✅');
    }
  };

  return (
    <div className="package-detection">
      <div className="detection-header">
        <Package className="header-icon" />
        <div>
          <h2>AI Package Detection</h2>
          <p>Upload a photo to automatically detect package size and weight</p>
        </div>
      </div>

      {/* Upload Section */}
      {!preview && (
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div className="upload-buttons">
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} />
              <span>Choose from Gallery</span>
            </button>

            <button
              className="upload-btn camera-btn"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={24} />
              <span>Take Photo</span>
            </button>
          </div>

          <div className="upload-tips">
            <p>📸 Tips for best results:</p>
            <ul>
              <li>Include the entire package in frame</li>
              <li>Use good lighting</li>
              <li>Place a reference object (e.g., phone) for scale</li>
              <li>Capture from multiple angles if unsure</li>
            </ul>
          </div>
        </div>
      )}

      {/* Preview & Analysis */}
      {preview && (
        <div className="preview-section">
          <div className="image-preview">
            <img src={preview} alt="Package preview" />
            <button
              className="change-image-btn"
              onClick={() => {
                setPreview(null);
                setImage(null);
                setResult(null);
              }}
            >
              Change Image
            </button>
          </div>

          {!result && !analyzing && (
            <button className="analyze-btn" onClick={analyzePackage}>
              Analyze Package with AI
            </button>
          )}

          {analyzing && (
            <div className="analyzing-state">
              <Loader className="spinner" />
              <p>Analyzing package with AI...</p>
              <span className="analyzing-subtext">This usually takes 3-5 seconds</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="analysis-results">
              <div className="results-header">
                <CheckCircle className="success-icon" />
                <h3>Analysis Complete</h3>
                <span className={`confidence-badge ${result.confidence >= 80 ? 'high' : result.confidence >= 60 ? 'medium' : 'low'}`}>
                  {result.confidence}% Confident
                </span>
              </div>

              <div className="results-grid">
                {/* Item Type */}
                <div className="result-card">
                  <label>Item Type</label>
                  <div className="result-value">
                    <span>{result.itemType}</span>
                    {!manualOverride && (
                      <button onClick={() => setManualOverride(true)}>
                        <Edit3 size={16} />
                      </button>
                    )}
                  </div>
                  {manualOverride && (
                    <select
                      value={result.itemType}
                      onChange={(e) => handleManualOverride('itemType', e.target.value)}
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Food">Food</option>
                      <option value="Documents">Documents</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>

                {/* Size */}
                <div className="result-card">
                  <label>Size Category</label>
                  <div className="result-value">
                    <span className={`size-badge ${result.size}`}>{result.size}</span>
                  </div>
                  {manualOverride && (
                    <select
                      value={result.size}
                      onChange={(e) => handleManualOverride('size', e.target.value)}
                    >
                      <option value="small">Small (fits in hand)</option>
                      <option value="medium">Medium (fits in bag)</option>
                      <option value="large">Large (needs 2 hands)</option>
                      <option value="extra_large">Extra Large (bulky)</option>
                    </select>
                  )}
                </div>

                {/* Weight */}
                <div className="result-card">
                  <label>Weight Category</label>
                  <div className="result-value">
                    <span className={`weight-badge ${result.weight}`}>{result.weight}</span>
                  </div>
                  {manualOverride && (
                    <select
                      value={result.weight}
                      onChange={(e) => handleManualOverride('weight', e.target.value)}
                    >
                      <option value="light">Light (&lt; 2kg)</option>
                      <option value="medium">Medium (2-10kg)</option>
                      <option value="heavy">Heavy (&gt; 10kg)</option>
                    </select>
                  )}
                </div>

                {/* Fragile */}
                <div className="result-card">
                  <label>Fragile Item</label>
                  <div className="result-value">
                    <span className={result.fragile ? 'fragile-yes' : 'fragile-no'}>
                      {result.fragile ? '⚠️ Yes' : '✅ No'}
                    </span>
                  </div>
                  {manualOverride && (
                    <select
                      value={result.fragile}
                      onChange={(e) => handleManualOverride('fragile', e.target.value === 'true')}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes - Handle with care</option>
                    </select>
                  )}
                </div>

                {/* Multiple Items */}
                <div className="result-card">
                  <label>Multiple Items</label>
                  <div className="result-value">
                    <span>{result.multipleItems ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Recommended Vehicle */}
                <div className="result-card vehicle-card">
                  <label>Recommended Vehicle</label>
                  <div className="vehicle-recommendation">
                    <span className={`vehicle-badge ${result.vehicle}`}>
                      {result.vehicle === 'bike' && '🏍️ Bike'}
                      {result.vehicle === 'tricycle' && '🛺 Tricycle'}
                      {result.vehicle === 'car' && '🚗 Car'}
                      {result.vehicle === 'van' && '🚐 Van'}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="ai-reasoning">
                <AlertCircle size={16} />
                <p><strong>AI Analysis:</strong> {result.reason}</p>
              </div>

              {/* Manual Override Toggle */}
              <div className="override-section">
                <label className="override-toggle">
                  <input
                    type="checkbox"
                    checked={manualOverride}
                    onChange={(e) => setManualOverride(e.target.checked)}
                  />
                  <span>Enable manual adjustments</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button className="retry-btn" onClick={() => {
                  setResult(null);
                  setPreview(null);
                  setImage(null);
                }}>
                  Try Another Image
                </button>
                <button className="confirm-btn" onClick={confirmSelection}>
                  Confirm & Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PackageDetection;
