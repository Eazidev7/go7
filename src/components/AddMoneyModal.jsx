import React, { useState } from 'react';
import './AddMoneyModal.css';

/**
 * 💰 Professional Add Money Modal
 * Shows funding options: Virtual Account & Card Payment
 */
export default function AddMoneyModal({ isOpen, onClose, virtualAccount, userName }) {
  const [activeTab, setActiveTab] = useState('bank'); // bank or card

  if (!isOpen) return null;

  const copyAccountNumber = async () => {
    if (!virtualAccount?.account_number) {
      showModernToast('No account number available!', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(virtualAccount.account_number);
      showModernToast('Account number copied!', 'success');
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = virtualAccount.account_number;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showModernToast('Account number copied!', 'success');
      } catch (fallbackError) {
        showModernToast('Copy failed!', 'error');
        console.error('Clipboard copy failed:', fallbackError);
      }
    }
  };

  // Ultra-modern floating card notification
  const showModernToast = (message, type = 'success') => {
    // Create floating card notification
    const card = document.createElement('div');
    card.className = `floating-copy-card ${type}`;
    card.innerHTML = `
      <div class="card-glow"></div>
      <div class="card-content">
        <div class="card-icon-wrapper">
          <div class="card-icon">
            ${type === 'success' ? '💳' : '❌'}
          </div>
          <div class="success-ripple"></div>
        </div>
        <div class="card-text">
          <div class="card-title">${type === 'success' ? 'Copied Successfully!' : 'Copy Failed'}</div>
          <div class="card-subtitle">${message}</div>
        </div>
        <div class="card-particles">
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
        </div>
      </div>
    `;
    
    const styles = `
      .floating-copy-card {
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        width: 320px;
        padding: 24px;
        border-radius: 24px;
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
        box-shadow: 
          0 20px 60px rgba(0, 0, 0, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: cardFloat 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        overflow: hidden;
        position: relative;
      }
      .floating-copy-card.success {
        background: linear-gradient(135deg, 
          rgba(224, 0, 27, 0.9) 0%,
          rgba(200, 0, 24, 0.95) 50%,
          rgba(224, 0, 27, 0.9) 100%);
        border: 2px solid rgba(255, 255, 255, 0.15);
      }
      .floating-copy-card.error {
        background: linear-gradient(135deg, 
          rgba(239, 68, 68, 0.9) 0%,
          rgba(220, 38, 38, 0.95) 50%,
          rgba(239, 68, 68, 0.9) 100%);
        border: 2px solid rgba(255, 255, 255, 0.15);
      }
      .card-glow {
        position: absolute;
        inset: -2px;
        background: linear-gradient(45deg, 
          rgba(255, 255, 255, 0.3),
          transparent,
          rgba(255, 255, 255, 0.3));
        border-radius: 24px;
        animation: cardGlow 2s ease-in-out infinite;
        z-index: -1;
      }
      .card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        color: white;
        position: relative;
        z-index: 2;
      }
      .card-icon-wrapper {
        position: relative;
        flex-shrink: 0;
      }
      .card-icon {
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        font-size: 24px;
        position: relative;
        z-index: 3;
        animation: cardIconBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      .success-ripple {
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.4), transparent 70%);
        animation: successRipple 1s ease-out;
      }
      .card-text {
        flex: 1;
      }
      .card-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 4px;
        letter-spacing: -0.02em;
      }
      .card-subtitle {
        font-size: 14px;
        opacity: 0.85;
        font-weight: 500;
      }
      .card-particles {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        animation: particleFloat 3s ease-in-out infinite;
      }
      .particle:nth-child(1) {
        top: 20%;
        left: 20%;
        animation-delay: 0s;
      }
      .particle:nth-child(2) {
        top: 60%;
        right: 25%;
        animation-delay: 0.5s;
      }
      .particle:nth-child(3) {
        bottom: 30%;
        left: 70%;
        animation-delay: 1s;
      }
      @keyframes cardFloat {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(60px) scale(0.8) rotateY(30deg);
        }
        60% {
          opacity: 0.9;
          transform: translateX(-50%) translateY(-10px) scale(1.02) rotateY(-5deg);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1) rotateY(0deg);
        }
      }
      @keyframes cardGlow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
      @keyframes cardIconBounce {
        0% { transform: scale(0) rotateZ(-180deg); }
        50% { transform: scale(1.2) rotateZ(-90deg); }
        100% { transform: scale(1) rotateZ(0deg); }
      }
      @keyframes successRipple {
        0% { transform: scale(0); opacity: 0.8; }
        100% { transform: scale(2); opacity: 0; }
      }
      @keyframes particleFloat {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
        50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
      }
      @media (max-width: 768px) {
        .floating-copy-card {
          left: 16px;
          right: 16px;
          width: auto;
          transform: none;
        }
      }
    `;
    
    if (!document.querySelector('#floating-card-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'floating-card-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(card);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'success' ? [50, 30, 50] : [100]);
    }
    
    setTimeout(() => {
      card.style.animation = 'cardFloat 0.6s reverse';
      setTimeout(() => card.remove(), 600);
    }, 3500);
  };

  // Add ultra-modern copy button styles
  React.useEffect(() => {
    const ultraCopyStyles = `
      .ultra-copy-btn {
        position: relative;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform-style: preserve-3d;
      }
      .ultra-copy-btn:hover {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 12px 35px rgba(224, 0, 27, 0.3);
      }
      .ultra-copy-btn:active {
        transform: translateY(-1px) scale(0.98);
      }
      .ultra-copy-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
        transform: translateX(-100%) skew(20deg);
        transition: transform 0.6s;
      }
      .ultra-copy-btn:hover::before {
        transform: translateX(200%) skew(20deg);
      }
      .ultra-copy-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent 70%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .ultra-copy-btn:active::after {
        opacity: 1;
        animation: copyPulse 0.4s ease-out;
      }
      @keyframes copyPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    
    if (!document.querySelector('#ultra-copy-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ultra-copy-styles';
      styleSheet.textContent = ultraCopyStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  return (
    <div className="add-money-modal-overlay" onClick={onClose}>
      <div className="add-money-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Add Money</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Bank Transfer
          </button>
          <button 
            className={`tab-btn ${activeTab === 'card' ? 'active' : ''}`}
            onClick={() => setActiveTab('card')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Debit Card
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-content">
          {activeTab === 'bank' ? (
            <div className="bank-transfer-content">
              <div className="info-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Transfer to this account. Funds reflect instantly!
              </div>

              <div className="account-details-box">
                <div className="account-detail-row">
                  <span className="detail-label">Bank Name</span>
                  <span className="detail-value">{virtualAccount?.bank_name || 'Titan Paystack'}</span>
                </div>

                <div className="account-detail-row">
                  <span className="detail-label">Account Number</span>
                  <div className="account-number-box">
                    <span className="detail-value account-num">{virtualAccount?.account_number || 'Not available'}</span>
                    <button className="copy-icon-btn ultra-copy-btn" onClick={copyAccountNumber}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="account-detail-row">
                  <span className="detail-label">Account Name</span>
                  <span className="detail-value">{virtualAccount?.account_name || userName || 'Your Name'}</span>
                </div>
              </div>

              <div className="feature-list">
                <div className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Instant credit
                </div>
                <div className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  No transaction fee
                </div>
                <div className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  24/7 availability
                </div>
              </div>
            </div>
          ) : (
            <div className="card-payment-content">
              <div className="card-illustration">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <h3>Pay with Card</h3>
              <p>Enter amount and pay securely with your debit card via Paystack</p>
              
              <div className="amount-input-group">
                <label>Amount (₦)</label>
                <input 
                  type="number" 
                  placeholder="Enter amount" 
                  className="amount-input"
                  min="100"
                />
              </div>

              <button className="pay-now-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Pay with Card
              </button>

              <p className="secure-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Secured by Paystack
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
