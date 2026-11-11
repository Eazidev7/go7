import { getFunctions, httpsCallable } from 'firebase/functions';
import Swal from 'sweetalert2';

/**
 * Backfill a past Paystack payment that wasn't automatically credited
 * 
 * @param {string} reference - The Paystack payment reference (e.g., "ref_123abc")
 * @param {string} userId - Optional user ID (will be auto-detected if not provided)
 * @returns {Promise<object>} Result of the backfill operation
 */
export const backfillPayment = async (reference, userId = null) => {
  try {
    console.log('🔄 Backfilling payment:', reference);

    const functions = getFunctions();
    const backfill = httpsCallable(functions, 'backfillPayment');

    const result = await backfill({ reference, userId });

    if (result.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Payment Credited!',
        html: `
          <p><strong>₦${result.data.amount}</strong> has been added to your wallet</p>
          <p class="text-sm text-gray-600">Reference: ${result.data.reference}</p>
        `,
        confirmButtonColor: '#e53935'
      });

      return result.data;
    } else {
      await Swal.fire({
        icon: 'info',
        title: 'Already Processed',
        text: result.data.message,
        confirmButtonColor: '#e53935'
      });

      return result.data;
    }
  } catch (error) {
    console.error('❌ Backfill error:', error);

    await Swal.fire({
      icon: 'error',
      title: 'Backfill Failed',
      text: error.message || 'Failed to process payment. Please contact support.',
      confirmButtonColor: '#e53935'
    });

    throw error;
  }
};

/**
 * Show a dialog to manually backfill a payment
 * Useful for customer support or self-service
 */
export const showBackfillDialog = async () => {
  const { value: reference } = await Swal.fire({
    title: 'Backfill Past Payment',
    html: `
      <p class="text-sm text-gray-600 mb-4">
        If you made a payment that wasn't credited to your wallet, 
        enter your payment reference below to credit it manually.
      </p>
      <input
        id="payment-reference"
        class="swal2-input"
        placeholder="e.g., ref_abc123xyz"
        style="width: 100%; margin: 0;"
      >
      <p class="text-xs text-gray-500 mt-2">
        You can find your payment reference in your email receipt from Paystack
      </p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Credit Wallet',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#e53935',
    cancelButtonColor: '#6c757d',
    preConfirm: () => {
      const refInput = document.getElementById('payment-reference');
      const ref = refInput.value.trim();
      
      if (!ref) {
        Swal.showValidationMessage('Please enter a payment reference');
        return false;
      }
      
      return ref;
    }
  });

  if (reference) {
    await backfillPayment(reference);
  }
};
