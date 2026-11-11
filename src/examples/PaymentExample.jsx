// Example client-side code showing how to use the secure payment verification

import { usePaystack } from '../hooks/usePaystack';

const ExamplePaymentComponent = () => {
  const { initializePayment, loading, error } = usePaystack();
  const user = { uid: 'user123', email: 'test@example.com' }; // From auth

  // Example 1: Wallet Top-Up
  const handleWalletTopUp = () => {
    initializePayment({
      amount: 2500, // ₦2,500
      email: user.email,
      userId: user.uid,
      purpose: 'wallet_topup',
      onSuccess: (result) => {
        alert(`✅ Wallet credited with ₦${result.amount}!\\nReference: ${result.reference}`);
        // Redirect to profile or refresh wallet balance
      },
      onError: (error) => {
        alert(`❌ Payment failed: ${error.message}`);
      },
      onClose: () => {
        console.log('Payment popup closed');
      }
    });
  };

  // Example 2: Order Payment  
  const handleOrderPayment = () => {
    const orderData = {
      id: 'order_12345',
      total: 3500 // ₦3,500
    };

    initializePayment({
      amount: orderData.total,
      email: user.email, 
      userId: user.uid,
      purpose: 'order_payment',
      orderId: orderData.id,
      onSuccess: (result) => {
        alert(`✅ Order payment successful!\\nOrder: ${result.orderId}\\nAmount: ₦${result.amount}`);
        // Redirect to order tracking or confirmation
      },
      onError: (error) => {
        alert(`❌ Order payment failed: ${error.message}`);
      }
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Secure Paystack Payment Examples</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      <div className="space-y-4">
        <button
          onClick={handleWalletTopUp}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Top Up Wallet (₦2,500)'}
        </button>
        
        <button  
          onClick={handleOrderPayment}
          disabled={loading}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Pay for Order (₦3,500)'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">What happens when you click "Pay":</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Paystack popup opens with payment form</li>
          <li>User completes payment (use test cards in development)</li>
          <li>Paystack calls our <code>onSuccess</code> callback</li>
          <li>Frontend calls <code>POST /api/wallet/credit</code> with reference</li>
          <li>Backend verifies payment with Paystack API using secret key</li>
          <li>If verified, Firestore is updated (wallet balance or order status)</li>
          <li>Success message shown to user</li>
        </ol>
      </div>
    </div>
  );
};

export default ExamplePaymentComponent;