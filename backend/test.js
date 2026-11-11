const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let testPhoneNumber = '+2348012345678';
let receivedOtp = '';

console.log('╔════════════════════════════════════════╗');
console.log('║   Go7 OTP API - Automated Tests      ║');
console.log('╚════════════════════════════════════════╝\n');

// Test 1: Health Check
async function testHealthCheck() {
  try {
    console.log('🧪 Test 1: Health Check');
    const response = await axios.get(`${BASE_URL}/`);
    console.log('✅ PASS - Server is running');
    console.log('   Response:', response.data.message);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ FAIL - Server health check failed');
    console.log('   Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 2: Send OTP
async function testSendOtp() {
  try {
    console.log('🧪 Test 2: Send OTP');
    const response = await axios.post(`${BASE_URL}/api/send-otp`, {
      phoneNumber: testPhoneNumber
    });
    
    if (response.data.success) {
      receivedOtp = response.data.devOtp;
      console.log('✅ PASS - OTP sent successfully');
      console.log('   OTP:', receivedOtp);
      console.log('   Expires in:', response.data.expiresIn, 'seconds');
      console.log('');
      return true;
    } else {
      console.log('❌ FAIL - Failed to send OTP');
      console.log('');
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL - Send OTP request failed');
    console.log('   Error:', error.response?.data || error.message);
    console.log('');
    return false;
  }
}

// Test 3: Verify OTP with wrong code
async function testVerifyWrongOtp() {
  try {
    console.log('🧪 Test 3: Verify Wrong OTP');
    const response = await axios.post(`${BASE_URL}/api/verify-otp`, {
      phoneNumber: testPhoneNumber,
      otp: '999999'
    });
    
    console.log('❌ FAIL - Wrong OTP should not be verified');
    console.log('');
    return false;
  } catch (error) {
    if (error.response?.data?.message === 'Invalid OTP') {
      console.log('✅ PASS - Wrong OTP rejected correctly');
      console.log('   Attempts left:', error.response.data.attemptsLeft);
      console.log('');
      return true;
    } else {
      console.log('❌ FAIL - Unexpected error');
      console.log('   Error:', error.response?.data || error.message);
      console.log('');
      return false;
    }
  }
}

// Test 4: Verify OTP with correct code
async function testVerifyCorrectOtp() {
  try {
    console.log('🧪 Test 4: Verify Correct OTP');
    const response = await axios.post(`${BASE_URL}/api/verify-otp`, {
      phoneNumber: testPhoneNumber,
      otp: receivedOtp
    });
    
    if (response.data.success) {
      console.log('✅ PASS - OTP verified successfully');
      console.log('   User:', response.data.user);
      console.log('');
      return true;
    } else {
      console.log('❌ FAIL - Valid OTP not verified');
      console.log('');
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL - Verify OTP request failed');
    console.log('   Error:', error.response?.data || error.message);
    console.log('');
    return false;
  }
}

// Test 5: Verify already used OTP
async function testVerifyUsedOtp() {
  try {
    console.log('🧪 Test 5: Verify Already Used OTP');
    const response = await axios.post(`${BASE_URL}/api/verify-otp`, {
      phoneNumber: testPhoneNumber,
      otp: receivedOtp
    });
    
    console.log('❌ FAIL - Used OTP should not be verified again');
    console.log('');
    return false;
  } catch (error) {
    if (error.response?.data?.message === 'OTP already used') {
      console.log('✅ PASS - Used OTP rejected correctly');
      console.log('');
      return true;
    } else {
      console.log('❌ FAIL - Unexpected error');
      console.log('   Error:', error.response?.data || error.message);
      console.log('');
      return false;
    }
  }
}

// Test 6: Rate limiting on resend
async function testRateLimiting() {
  try {
    console.log('🧪 Test 6: Rate Limiting (Resend OTP)');
    
    // Send first OTP
    await axios.post(`${BASE_URL}/api/send-otp`, {
      phoneNumber: '+2348099999999'
    });
    
    // Try to resend immediately
    const response = await axios.post(`${BASE_URL}/api/resend-otp`, {
      phoneNumber: '+2348099999999'
    });
    
    console.log('❌ FAIL - Rate limiting should prevent immediate resend');
    console.log('');
    return false;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('✅ PASS - Rate limiting working correctly');
      console.log('   Retry after:', error.response.data.retryAfter, 'seconds');
      console.log('');
      return true;
    } else {
      console.log('❌ FAIL - Unexpected error');
      console.log('   Error:', error.response?.data || error.message);
      console.log('');
      return false;
    }
  }
}

// Test 7: Missing parameters
async function testMissingParameters() {
  try {
    console.log('🧪 Test 7: Missing Parameters Validation');
    const response = await axios.post(`${BASE_URL}/api/send-otp`, {});
    
    console.log('❌ FAIL - Should reject missing parameters');
    console.log('');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ PASS - Missing parameters rejected correctly');
      console.log('   Message:', error.response.data.message);
      console.log('');
      return true;
    } else {
      console.log('❌ FAIL - Unexpected error');
      console.log('   Error:', error.response?.data || error.message);
      console.log('');
      return false;
    }
  }
}

// Run all tests
async function runTests() {
  console.log('Starting tests...\n');
  
  const results = [];
  
  results.push(await testHealthCheck());
  results.push(await testSendOtp());
  
  // Wait 1 second before verifying
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.push(await testVerifyWrongOtp());
  results.push(await testVerifyCorrectOtp());
  results.push(await testVerifyUsedOtp());
  results.push(await testRateLimiting());
  results.push(await testMissingParameters());
  
  // Summary
  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  
  console.log('╔════════════════════════════════════════╗');
  console.log('║          Test Results Summary         ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Total Tests:  ${results.length}                       ║`);
  console.log(`║  Passed:       ${passed}                       ║`);
  console.log(`║  Failed:       ${failed}                       ║`);
  console.log('╚════════════════════════════════════════╝');
  
  process.exit(failed === 0 ? 0 : 1);
}

// Check if server is running before tests
axios.get(`${BASE_URL}/`)
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.log('❌ Server is not running!');
    console.log('   Please start the server first: npm start');
    process.exit(1);
  });
