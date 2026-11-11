import React, { useEffect, useState } from "react";

/**
 * 🔍 Paystack Debug Component for Go7
 * 
 * This component helps diagnose and fix Paystack key loading issues
 * Supports both Create-React-App (REACT_APP_) and Vite (VITE_) environments
 */
export default function PaystackDebug() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [keyInfo, setKeyInfo] = useState({});

  useEffect(() => {
    // Check if Paystack SDK is loaded
    const checkSDK = () => {
      if (window.PaystackPop) {
        setSdkLoaded(true);
        console.log('✅ Paystack SDK loaded successfully');
      } else {
        console.warn('⚠️ Paystack SDK not loaded, retrying...');
        setTimeout(checkSDK, 500);
      }
    };

    checkSDK();

    // Debug environment variables (Vite only)
    const debugInfo = {
      // Vite environment variables
      viteKey: import.meta?.env?.VITE_PAYSTACK_PUBLIC_KEY,
      viteMode: import.meta?.env?.MODE,
      viteEnv: import.meta?.env,
      
      // Final resolved key
      finalKey: null
    };

    // Determine the final key to use
    debugInfo.finalKey = debugInfo.viteKey || "";

    setKeyInfo(debugInfo);

    console.log('🔍 Environment Debug Info:', {
      'Vite Key': debugInfo.viteKey ? `${debugInfo.viteKey.substring(0, 20)}...` : '❌ Not found',
      'Final Key': debugInfo.finalKey ? `${debugInfo.finalKey.substring(0, 20)}...` : '❌ Not found',
      'Environment': debugInfo.viteMode || 'Unknown',
      'Build System': 'Vite'
    });
  }, []);

  const handlePay = () => {
    // 1️⃣ Check if SDK loaded
    if (!window.PaystackPop) {
      alert("⚠️ Paystack SDK not loaded yet. Please refresh the page and try again.");
      console.error('❌ PaystackPop not available on window object');
      return;
    }

    // 2️⃣ Load correct key (Vite)
    const key = keyInfo.finalKey;

    console.log("🔑 Using Paystack Key:", key ? `${key.substring(0, 20)}...${key.substring(key.length - 10)}` : '❌ No key found');
    console.log("🔍 Key Details:", {
      length: key?.length || 0,
      startsWithPk: key?.startsWith("pk_") || false,
      isLive: key?.includes("live") || false,
      isTest: key?.includes("test") || false
    });

    // 3️⃣ Validate key
    if (!key || !key.startsWith("pk_")) {
      alert(`⚠️ Invalid Paystack public key detected!

Key found: ${key || 'None'}
Length: ${key?.length || 0}
Starts with 'pk_': ${key?.startsWith("pk_") || false}

Please check your .env file:
- For Vite: VITE_PAYSTACK_PUBLIC_KEY=pk_live_...

Restart your dev server after updating the .env file.`);
      return;
    }

    console.log("✅ Key validation passed, opening Paystack popup...");

    try {
      // 4️⃣ Open popup with test data
      const handler = window.PaystackPop.setup({
        key,
        email: "test@go7.ng",
        amount: 200000, // ₦2000 in kobo
        currency: "NGN",
        ref: `GO7-DEBUG-${Date.now()}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Test Type",
              variable_name: "test_type",
              value: "Debug Payment"
            },
            {
              display_name: "App",
              variable_name: "app_name", 
              value: "Go7 Delivery"
            }
          ]
        },
        callback: function (response) {
          console.log("✅ Payment successful:", response);
          alert(`✅ Payment Successful!

Reference: ${response.reference}
Amount: ₦2,000
Status: ${response.status}

This was a test payment. Check your Paystack dashboard to confirm.`);
        },
        onClose: function () {
          console.log("❌ Payment popup closed by user");
          alert("Payment window was closed. You can try again anytime.");
        }
      });

      console.log("🚀 Opening Paystack iframe...");
      handler.openIframe();

    } catch (error) {
      console.error('❌ Error setting up Paystack:', error);
      alert(`⚠️ Error setting up payment:

${error.message}

Please check:
1. Paystack SDK is loaded
2. Your public key is valid
3. Network connection is stable`);
    }
  };

  return (
    <div style={{ 
      textAlign: "center", 
      marginTop: "50px",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h2 style={{ color: "#e53935", marginBottom: "20px" }}>
        🔍 Go7 Paystack Debug Tool
      </h2>
      
      {/* SDK Status */}
      <div style={{
        padding: "15px",
        marginBottom: "20px",
        backgroundColor: sdkLoaded ? "#e8f5e8" : "#ffeaa7",
        border: `2px solid ${sdkLoaded ? "#4caf50" : "#f39c12"}`,
        borderRadius: "8px"
      }}>
        <h3 style={{ margin: "0 0 10px 0", color: sdkLoaded ? "#2e7d32" : "#d68910" }}>
          {sdkLoaded ? "✅ Paystack SDK Status" : "⚠️ Paystack SDK Status"}
        </h3>
        <p style={{ margin: 0, color: "#333" }}>
          {sdkLoaded ? "SDK loaded successfully" : "SDK loading... please wait"}
        </p>
      </div>

      {/* Key Status */}
      <div style={{
        padding: "15px",
        marginBottom: "20px", 
        backgroundColor: keyInfo.finalKey ? "#e8f5e8" : "#ffebee",
        border: `2px solid ${keyInfo.finalKey ? "#4caf50" : "#f44336"}`,
        borderRadius: "8px"
      }}>
        <h3 style={{ margin: "0 0 10px 0", color: keyInfo.finalKey ? "#2e7d32" : "#c62828" }}>
          {keyInfo.finalKey ? "✅ Paystack Key Status" : "❌ Paystack Key Status"}
        </h3>
        <div style={{ textAlign: "left", fontSize: "14px", color: "#333" }}>
          <p><strong>Key Found:</strong> {keyInfo.finalKey ? `${keyInfo.finalKey.substring(0, 20)}...` : "None"}</p>
          <p><strong>Source:</strong> {keyInfo.viteKey ? "Vite (.env)" : "Not found"}</p>
          <p><strong>Length:</strong> {keyInfo.finalKey?.length || 0} characters</p>
          <p><strong>Type:</strong> {keyInfo.finalKey?.includes("live") ? "Live Key" : keyInfo.finalKey?.includes("test") ? "Test Key" : "Unknown"}</p>
        </div>
      </div>

      {/* Test Payment Button */}
      <button
        onClick={handlePay}
        disabled={!sdkLoaded || !keyInfo.finalKey}
        style={{
          backgroundColor: (!sdkLoaded || !keyInfo.finalKey) ? "#ccc" : "#e53935",
          color: "white",
          padding: "15px 30px",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: (!sdkLoaded || !keyInfo.finalKey) ? "not-allowed" : "pointer",
          marginBottom: "20px"
        }}
      >
        {(!sdkLoaded || !keyInfo.finalKey) ? "⏳ Please Wait..." : "💳 Test Payment ₦2,000"}
      </button>

      {/* Instructions */}
      <div style={{
        padding: "15px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        fontSize: "14px",
        textAlign: "left"
      }}>
        <h4 style={{ margin: "0 0 10px 0" }}>🛠️ Troubleshooting Steps:</h4>
        <ol style={{ margin: 0, paddingLeft: "20px" }}>
          <li>Check your <code>.env</code> file has: <code>VITE_PAYSTACK_PUBLIC_KEY=pk_live_...</code></li>
          <li>Ensure no spaces or quotes around the key</li>
          <li>Restart your dev server after changing .env</li>
          <li>Clear browser cache if needed</li>
          <li>Check browser console for detailed logs</li>
        </ol>
      </div>

      {/* Test Cards Info */}
      <div style={{
        padding: "15px",
        backgroundColor: "#e3f2fd",
        borderRadius: "8px",
        fontSize: "14px",
        textAlign: "left",
        marginTop: "15px"
      }}>
        <h4 style={{ margin: "0 0 10px 0" }}>💳 Test Card Details:</h4>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li><strong>Card Number:</strong> 4084084084084081</li>
          <li><strong>CVV:</strong> 408</li>
          <li><strong>Expiry:</strong> Any future date (e.g., 12/26)</li>
          <li><strong>PIN:</strong> 0000 (if required)</li>
        </ul>
      </div>
    </div>
  );
}