import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Swal from 'sweetalert2';
import './RecoverPayment.css';

const RecoverPayment = () => {
  const { currentUser } = useAuth();
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecover = async () => {
    if (!reference.trim()) {
      await Swal.fire('Error', 'Please enter a payment reference', 'error');
      return;
    }

    setLoading(true);
    try {
      const functions = getFunctions();
      const backfillPayment = httpsCallable(functions, 'backfillPayment');
      
      const result = await backfillPayment({
        reference: reference.trim(),
        userId: currentUser.uid
      });

      if (result.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Payment Recovered!',
          html: `
            <p>Amount: ₦${result.data.amount}</p>
            <p>Your wallet has been credited successfully.</p>
          `,
          confirmButtonColor: '#e61e25'
        });
        setReference('');
      } else {
        await Swal.fire('Error', result.data.message || 'Payment recovery failed', 'error');
      }
    } catch (error) {
      console.error('Recovery error:', error);
      await Swal.fire('Error', error.message || 'Failed to recover payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recover-payment-page">
      <div className="recover-container">
        <div className="recover-header">
          <h1>💰 Recover Missing Payment</h1>
          <p>If you made a payment that wasn't credited, enter the payment reference below</p>
        </div>

        <div className="recover-form">
          <div className="form-group">
            <label>Payment Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Enter Paystack payment reference"
              disabled={loading}
            />
            <small>You can find this in your payment confirmation email or bank statement</small>
          </div>

          <button 
            onClick={handleRecover}
            disabled={loading || !reference.trim()}
            className="recover-btn"
          >
            {loading ? '⏳ Processing...' : '🔄 Recover Payment'}
          </button>
        </div>

        <div className="recover-info">
          <h3>📝 How to find your payment reference:</h3>
          <ul>
            <li>Check your payment confirmation email from Paystack</li>
            <li>Check your bank statement for the transaction reference</li>
            <li>Login to your Paystack dashboard and find the transaction</li>
          </ul>

          <div className="help-box">
            <strong>Your Virtual Account:</strong>
            <p>Account Number: 9950296265</p>
            <p>Bank: Paystack-Titan</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoverPayment;
