import React from 'react';
import './CheckoutProgress.css';

const CheckoutProgress = ({ currentStep = 1 }) => {
  const steps = [
    { id: 1, label: 'Your Order', icon: '🛍️' },
    { id: 2, label: 'Delivery & Payment', icon: '💳' }
  ];

  return (
    <div className="checkout-progress">
      <div className="progress-container">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
              <div className="step-indicator">
                {currentStep > step.id ? (
                  <span className="step-check">✓</span>
                ) : (
                  <span className="step-icon">{step.icon}</span>
                )}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`progress-line ${currentStep > step.id ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CheckoutProgress;