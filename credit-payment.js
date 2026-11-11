// Quick payment recovery script
// Run this in browser console on localhost:9999

async function creditPayment() {
  const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
  
  const functions = getFunctions();
  const backfillPayment = httpsCallable(functions, 'backfillPayment');
  
  try {
    console.log('🔄 Processing payment recovery...');
    const result = await backfillPayment({
      reference: '100033251031113406958333210106',
      userId: 'M8Gol8PxRJbvhVincONS8FJRdFE3'
    });
    
    console.log('✅ Result:', result.data);
    
    if (result.data.success) {
      alert('✅ Payment Credited Successfully!\n\nAmount: ₦' + result.data.amount + '\n\nYour wallet has been updated.');
      window.location.reload();
    } else {
      alert('❌ Error: ' + result.data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
}

creditPayment();
