/**
 * Go7 Email System Test Suite
 * Tests all email templates with Brevo API
 * 
 * Usage: node testEmail.js
 */

require("dotenv").config();
const {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOutForDelivery,
  sendDeliveryComplete,
  sendBookDeliveryConfirmation,
  sendVendorApproved,
  sendPasswordReset,
} = require("./controllers/emailController");

// Test email address (replace with your email)
const TEST_EMAIL = "feyisetantobiloba@gmail.com";

async function runEmailTests() {
  console.log("🧪 Starting Go7 Email System Tests...\n");

  try {
    // Test 1: Welcome Email
    console.log("1️⃣ Testing Welcome Email...");
    await sendWelcomeEmail({
      email: TEST_EMAIL,
      name: "John Doe",
    });
    console.log("✅ Welcome email sent!\n");

    // Test 2: Order Confirmation
    console.log("2️⃣ Testing Order Confirmation Email...");
    await sendOrderConfirmation({
      id: "GO7-2025-001",
      customerEmail: TEST_EMAIL,
      customerName: "John Doe",
      items: "Jollof Rice & Chicken, 2x Coca-Cola",
      amount: 4500,
    });
    console.log("✅ Order confirmation email sent!\n");

    // Test 3: Out for Delivery
    console.log("3️⃣ Testing Out-for-Delivery Email...");
    await sendOutForDelivery({
      id: "GO7-2025-001",
      customerEmail: TEST_EMAIL,
      customerName: "John Doe",
      riderName: "Ahmed Ibrahim",
      riderPhone: "+234 812 345 6789",
      eta: "15-20 minutes",
    });
    console.log("✅ Out-for-delivery email sent!\n");

    // Test 4: Delivery Complete
    console.log("4️⃣ Testing Delivery Complete Email...");
    await sendDeliveryComplete({
      id: "GO7-2025-001",
      customerEmail: TEST_EMAIL,
      customerName: "John Doe",
      deliveredAt: new Date().toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    });
    console.log("✅ Delivery complete email sent!\n");

    // Test 5: Book Delivery Confirmation
    console.log("5️⃣ Testing Book Delivery Confirmation Email...");
    await sendBookDeliveryConfirmation({
      id: "GO7-DEL-2025-001",
      customerEmail: TEST_EMAIL,
      customerName: "John Doe",
      pickupAddress: "123 Allen Avenue, Ikeja, Lagos",
      destination: "45 Victoria Island, Lagos",
      amount: 2500,
    });
    console.log("✅ Book delivery confirmation sent!\n");

    // Test 6: Vendor Approved
    console.log("6️⃣ Testing Vendor Approval Email...");
    await sendVendorApproved({
      email: TEST_EMAIL,
      name: "Chowdeck Restaurant",
    });
    console.log("✅ Vendor approval email sent!\n");

    // Test 7: Password Reset
    console.log("7️⃣ Testing Password Reset Email...");
    await sendPasswordReset({
      email: TEST_EMAIL,
      name: "John Doe",
      resetLink: "https://go7.ng/reset-password?token=abc123xyz789",
    });
    console.log("✅ Password reset email sent!\n");

    console.log("🎉 All 7 email tests completed successfully!");
    console.log(`📧 Check your inbox at: ${TEST_EMAIL}`);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
    process.exit(1);
  }
}

// Run tests
runEmailTests();
