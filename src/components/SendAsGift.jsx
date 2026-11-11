import React, { useState } from 'react';
import './SendAsGift.css';

const SendAsGift = ({ giftData, onGiftDataChange }) => {
  const [isGiftEnabled, setIsGiftEnabled] = useState(giftData?.enabled || false);
  const [formData, setFormData] = useState({
    receiverName: giftData?.receiverName || '',
    receiverPhone: giftData?.receiverPhone || '',
    giftNote: giftData?.giftNote || ''
  });

  const handleToggle = (enabled) => {
    setIsGiftEnabled(enabled);
    
    const newGiftData = enabled ? {
      enabled: true,
      ...formData
    } : {
      enabled: false,
      receiverName: '',
      receiverPhone: '',
      giftNote: ''
    };
    
    onGiftDataChange(newGiftData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(newFormData);
    
    if (isGiftEnabled) {
      onGiftDataChange({
        enabled: true,
        ...newFormData
      });
    }
  };

  return (
    <div className="send-as-gift">
      <div className="gift-toggle-section">
        <div className="toggle-header">
          <div className="toggle-info">
            <span className="gift-icon">🎁</span>
            <div className="toggle-text">
              <h4>Send as Gift</h4>
              <p>This order will be delivered to someone else</p>
            </div>
          </div>
          
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isGiftEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {isGiftEnabled && (
        <div className="gift-form">
          <div className="gift-form-header">
            <h5>Gift Details</h5>
            <p>We'll deliver this order to the recipient</p>
          </div>

          <div className="form-group">
            <label htmlFor="receiverName">Recipient Name</label>
            <input
              type="text"
              id="receiverName"
              name="receiverName"
              value={formData.receiverName}
              onChange={handleInputChange}
              placeholder="Enter recipient's full name"
              required={isGiftEnabled}
            />
          </div>

          <div className="form-group">
            <label htmlFor="receiverPhone">Recipient Phone</label>
            <input
              type="tel"
              id="receiverPhone"
              name="receiverPhone"
              value={formData.receiverPhone}
              onChange={handleInputChange}
              placeholder="+234 800 000 0000"
              required={isGiftEnabled}
            />
            <span className="field-note">
              We'll contact them for delivery coordination
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="giftNote">Gift Message (Optional)</label>
            <textarea
              id="giftNote"
              name="giftNote"
              value={formData.giftNote}
              onChange={handleInputChange}
              placeholder="Write a special message for the recipient..."
              rows="4"
              maxLength={200}
            />
            <div className="char-count">
              {formData.giftNote.length}/200 characters
            </div>
          </div>

          <div className="gift-notice">
            <div className="notice-icon">ℹ️</div>
            <div className="notice-text">
              <strong>Gift delivery info:</strong>
              <ul>
                <li>We'll call the recipient before delivery</li>
                <li>Your payment info stays private</li>
                <li>Gift message will be included with the order</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendAsGift;