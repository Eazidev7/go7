import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../contexts/AuthContext';
import './AddressManager.css';

const AddressManager = ({ 
  selectedAddress, 
  onSelectAddress, 
  onClose, 
  showAsModal = false 
}) => {
  const { currentUser } = useAuthContext();
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    phone: '',
    instructions: '',
    coordinates: null
  });

  const addressLabels = [
    { value: 'Home', icon: '🏠' },
    { value: 'Work', icon: '🏢' },
    { value: 'Other', icon: '📍' }
  ];

  // Load user addresses
  useEffect(() => {
    if (currentUser) {
      loadAddresses();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const addressesRef = collection(db, 'users', currentUser.uid, 'addresses');
      const snapshot = await getDocs(addressesRef);
      
      const addressList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAddresses(addressList);
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            coordinates: { lat: latitude, lng: longitude }
          }));
          
          // Reverse geocoding would go here to fill in address details
          // For now, just show coordinates
          alert(`GPS Location captured: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error('GPS Error:', error);
          alert('Could not access your location. Please check your browser settings.');
        }
      );
    } else {
      alert('GPS not supported by this browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please log in to save addresses');
      return;
    }

    try {
      const addressData = {
        ...formData,
        updatedAt: new Date()
      };

      if (editingAddress) {
        // Update existing address
        const addressRef = doc(db, 'users', currentUser.uid, 'addresses', editingAddress.id);
        await updateDoc(addressRef, addressData);
      } else {
        // Add new address
        const addressesRef = collection(db, 'users', currentUser.uid, 'addresses');
        await addDoc(addressesRef, {
          ...addressData,
          createdAt: new Date()
        });
      }

      // Reset form
      setFormData({
        label: '',
        street: '',
        city: '',
        state: '',
        phone: '',
        instructions: '',
        coordinates: null
      });
      setShowAddForm(false);
      setEditingAddress(null);
      
      // Reload addresses
      loadAddresses();
      
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Failed to save address. Please try again.');
    }
  };

  const handleEdit = (address) => {
    setFormData(address);
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const handleDelete = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      const addressRef = doc(db, 'users', currentUser.uid, 'addresses', addressId);
      await deleteDoc(addressRef);
      loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete address. Please try again.');
    }
  };

  const handleAddressSelect = (address) => {
    onSelectAddress && onSelectAddress(address);
    if (showAsModal) {
      onClose && onClose();
    }
  };

  const containerClass = showAsModal ? 'address-manager-modal' : 'address-manager';

  return (
    <div className={containerClass}>
      {showAsModal && (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Delivery Address</h3>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              <AddressManagerContent />
            </div>
          </div>
        </div>
      )}
      
      {!showAsModal && <AddressManagerContent />}
    </div>
  );

  function AddressManagerContent() {
    return (
      <>
        {!showAddForm ? (
          <>
            <div className="address-header">
              <h3>Delivery Addresses</h3>
              <button 
                className="add-address-btn"
                onClick={() => setShowAddForm(true)}
              >
                + Add New
              </button>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading addresses...</p>
              </div>
            ) : (
              <div className="addresses-list">
                {addresses.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📍</div>
                    <h4>No addresses saved</h4>
                    <p>Add your first delivery address to get started</p>
                  </div>
                ) : (
                  addresses.map(address => (
                    <div 
                      key={address.id}
                      className={`address-card ${selectedAddress?.id === address.id ? 'selected' : ''}`}
                      onClick={() => handleAddressSelect(address)}
                    >
                      <div className="address-content">
                        <div className="address-header-row">
                          <div className="address-label">
                            {addressLabels.find(l => l.value === address.label)?.icon || '📍'}
                            <span>{address.label}</span>
                          </div>
                          
                          <div className="address-actions">
                            <button 
                              className="edit-address-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(address);
                              }}
                            >
                              ✏️
                            </button>
                            <button 
                              className="delete-address-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(address.id);
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        <div className="address-text">
                          <p>{address.street}</p>
                          <p>{address.city}, {address.state}</p>
                          {address.phone && (
                            <p className="phone">📱 {address.phone}</p>
                          )}
                          {address.instructions && (
                            <p className="instructions">💬 {address.instructions}</p>
                          )}
                        </div>
                      </div>
                      
                      {selectedAddress?.id === address.id && (
                        <div className="selected-indicator">✓</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          <div className="add-address-form">
            <div className="form-header">
              <button 
                className="back-btn"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAddress(null);
                  setFormData({
                    label: '',
                    street: '',
                    city: '',
                    state: '',
                    phone: '',
                    instructions: '',
                    coordinates: null
                  });
                }}
              >
                ← Back
              </button>
              <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Address Label</label>
                <div className="label-options">
                  {addressLabels.map(labelOption => (
                    <button
                      key={labelOption.value}
                      type="button"
                      className={`label-btn ${formData.label === labelOption.value ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, label: labelOption.value }))}
                    >
                      {labelOption.icon} {labelOption.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="street">Street Address</label>
                <textarea
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Enter your full street address"
                  required
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="instructions">Delivery Instructions (Optional)</label>
                <textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  placeholder="Any special instructions for the delivery rider..."
                  rows="3"
                />
              </div>

              <button 
                type="button" 
                className="gps-btn"
                onClick={handleUseGPS}
              >
                📍 Use My Current Location
              </button>

              <button type="submit" className="save-address-btn">
                {editingAddress ? 'Update Address' : 'Save Address'}
              </button>
            </form>
          </div>
        )}
      </>
    );
  }
};

export default AddressManager;