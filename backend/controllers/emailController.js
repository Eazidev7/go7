const { sendEmail } = require("../utils/sendEmail");

/**
 * 1️⃣ Welcome Email — sent on user registration
 * @param {Object} user - User object
 * @param {string} user.email - User email
 * @param {string} user.name - User name
 */
async function sendWelcomeEmail(user) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#e53935,#d32f2f);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Welcome to Go7 🚀</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${user.name || "there"},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Welcome to <strong>Go7.ng</strong> — your fast, reliable delivery partner in Nigeria!
        </p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Track deliveries, manage orders, and get everything delivered with ease. We're excited to have you on board! 📦
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://go7.ng" 
             style="background:#e53935;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;">
            Start Exploring
          </a>
        </div>
        
        <p style="font-size:14px;color:#666;line-height:1.6;">
          Need help? Contact us at <a href="mailto:support@go7.ng" style="color:#e53935;">support@go7.ng</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;margin:0;">
          © ${new Date().getFullYear()} Go7.ng — Deliver Everything ⚡
        </p>
        <p style="font-size:12px;color:#999;margin:10px 0 0 0;">
          Abeokuta, Ogun State, Nigeria
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: user.email, 
    name: user.name,
    subject: "Welcome to Go7 🚀", 
    htmlContent 
  });
}

/**
 * 2️⃣ Order Confirmation Email
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.customerEmail - Customer email
 * @param {string} order.customerName - Customer name
 * @param {string} order.items - Order items description
 * @param {number} order.amount - Total amount
 */
async function sendOrderConfirmation(order) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4caf50,#388e3c);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Order Confirmed 🛍️</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${order.customerName},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Your Go7 order <strong>#${order.id}</strong> has been successfully confirmed!
        </p>
        
        <!-- Order Details -->
        <div style="background:#f9f9f9;padding:20px;border-radius:6px;margin:20px 0;">
          <h3 style="margin:0 0 15px 0;color:#333;font-size:18px;">Order Details</h3>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>Order ID:</strong> #${order.id}
          </p>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>Items:</strong> ${order.items}
          </p>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>Total Amount:</strong> <span style="color:#4caf50;font-size:18px;font-weight:bold;">₦${order.amount.toLocaleString()}</span>
          </p>
        </div>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          We'll notify you when your rider is on the way 🚴‍♂️
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://go7.ng/track/${order.id}" 
             style="background:#e53935;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;">
            Track Your Order
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;margin:0;">
          © ${new Date().getFullYear()} Go7.ng — Deliver Everything ⚡
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: order.customerEmail,
    name: order.customerName,
    subject: `Order #${order.id} Confirmed 🛍️`, 
    htmlContent 
  });
}

/**
 * 3️⃣ Out-for-Delivery Email
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.customerEmail - Customer email
 * @param {string} order.customerName - Customer name
 * @param {string} order.riderName - Rider name
 * @param {string} order.riderPhone - Rider phone
 * @param {string} order.eta - Estimated time of arrival
 */
async function sendOutForDelivery(order) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#ff9800,#f57c00);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Order Out for Delivery 🚴‍♂️</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${order.customerName},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Great news! Your Go7 order <strong>#${order.id}</strong> is now out for delivery.
        </p>
        
        <!-- Rider Details -->
        <div style="background:#fff8e1;padding:20px;border-radius:6px;margin:20px 0;border-left:4px solid #ff9800;">
          <h3 style="margin:0 0 15px 0;color:#333;font-size:18px;">Your Rider</h3>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>👤 Name:</strong> ${order.riderName}
          </p>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>📱 Phone:</strong> <a href="tel:${order.riderPhone}" style="color:#ff9800;">${order.riderPhone}</a>
          </p>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>⏰ ETA:</strong> ${order.eta}
          </p>
        </div>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Track your delivery in real-time and get notified when it arrives!
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://go7.ng/track/${order.id}" 
             style="background:#e53935;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;">
            Track Live Delivery
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;margin:0;">
          © ${new Date().getFullYear()} Go7.ng — Deliver Everything ⚡
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: order.customerEmail,
    name: order.customerName,
    subject: `Order #${order.id} Out for Delivery 🚴‍♂️`, 
    htmlContent 
  });
}

/**
 * 4️⃣ Delivery Complete Email
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.customerEmail - Customer email
 * @param {string} order.customerName - Customer name
 * @param {string} order.deliveredAt - Delivery timestamp
 */
async function sendDeliveryComplete(order) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4caf50,#388e3c);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">✅ Delivered Successfully!</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${order.customerName},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Your Go7 order <strong>#${order.id}</strong> has been successfully delivered! 🎉
        </p>
        
        <!-- Delivery Info -->
        <div style="background:#e8f5e9;padding:20px;border-radius:6px;margin:20px 0;border-left:4px solid #4caf50;">
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>📦 Order ID:</strong> #${order.id}
          </p>
          <p style="margin:8px 0;color:#666;font-size:14px;">
            <strong>🕐 Delivered At:</strong> ${order.deliveredAt}
          </p>
        </div>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          We hope you enjoyed our service! Have feedback? We'd love to hear from you.
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://go7.ng/orders/${order.id}" 
             style="background:#e53935;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;margin-right:10px;">
            View Order
          </a>
          <a href="https://go7.ng/feedback/${order.id}" 
             style="background:#fff;color:#e53935;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;border:2px solid #e53935;">
            Leave Feedback
          </a>
        </div>
        
        <p style="font-size:14px;color:#666;line-height:1.6;text-align:center;margin-top:30px;">
          Thank you for choosing Go7! 🚀
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;margin:0;">
          © ${new Date().getFullYear()} Go7.ng — Deliver Everything ⚡
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: order.customerEmail,
    name: order.customerName,
    subject: `Order #${order.id} Delivered Successfully ✅`, 
    htmlContent 
  });
}

/**
 * 5️⃣ Book Delivery Confirmation — sent when delivery request is created
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.customerEmail - Customer email
 * @param {string} order.customerName - Customer name
 * @param {string} order.pickupAddress - Pickup location
 * @param {string} order.destination - Delivery destination
 * @param {number} order.amount - Delivery fee
 */
async function sendBookDeliveryConfirmation(order) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#e53935,#d32f2f);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Delivery Request Received 🚚</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${order.customerName},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Your Go7 delivery request <strong>#${order.id}</strong> has been booked successfully.
        </p>
        
        <div style="background:#f9f9f9;padding:20px;border-radius:6px;margin:20px 0;">
          <p style="margin:8px 0;font-size:15px;color:#555;">
            <strong>Pickup:</strong> ${order.pickupAddress}
          </p>
          <p style="margin:8px 0;font-size:15px;color:#555;">
            <strong>Destination:</strong> ${order.destination}
          </p>
          <p style="margin:8px 0;font-size:15px;color:#555;">
            <strong>Amount:</strong> <span style="color:#e53935;font-weight:bold;">₦${order.amount.toLocaleString()}</span>
          </p>
        </div>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          We'll assign a rider shortly and update you when pickup begins.
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://go7.ng/orders/${order.id}" 
             style="background:#e53935;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;">
            Track Delivery
          </a>
        </div>
        
        <p style="font-size:14px;color:#666;line-height:1.6;">
          Questions? Contact us at <a href="mailto:support@go7.ng" style="color:#e53935;">support@go7.ng</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f5f5f5;padding:20px;text-align:center;border-top:1px solid #ddd;">
        <p style="margin:0;font-size:12px;color:#999;">
          © 2025 Go7.ng — Deliver Everything ⚡<br>
          Abeokuta, Nigeria
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: order.customerEmail,
    name: order.customerName,
    subject: `Delivery Request #${order.id} Confirmed 🚚`, 
    htmlContent 
  });
}

/**
 * 6️⃣ Vendor Registration Approved — sent when vendor account is activated
 * @param {Object} vendor - Vendor object
 * @param {string} vendor.email - Vendor email
 * @param {string} vendor.name - Vendor name
 */
async function sendVendorApproved(vendor) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4caf50,#388e3c);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Vendor Account Approved 🎉</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${vendor.name},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Congratulations! Your vendor account has been approved on <strong>Go7.ng</strong>.
        </p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          You can now post deliveries, manage orders, and access your vendor dashboard.
        </p>
        
        <div style="background:#f0f8f0;padding:20px;border-radius:6px;margin:20px 0;border-left:4px solid #4caf50;">
          <p style="margin:8px 0;font-size:15px;color:#555;">
            ✅ Post delivery requests<br>
            ✅ Manage active orders<br>
            ✅ Track rider assignments<br>
            ✅ View analytics & reports
          </p>
        </div>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://vendors.go7.ng/login" 
             style="background:#4caf50;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;">
            Go to Dashboard
          </a>
        </div>
        
        <p style="font-size:14px;color:#666;line-height:1.6;">
          Need help getting started? Email us at <a href="mailto:vendors@go7.ng" style="color:#4caf50;">vendors@go7.ng</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f5f5f5;padding:20px;text-align:center;border-top:1px solid #ddd;">
        <p style="margin:0;font-size:12px;color:#999;">
          © 2025 Go7.ng — Deliver Everything ⚡<br>
          Abeokuta, Nigeria
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: vendor.email,
    name: vendor.name,
    subject: "Your Go7 Vendor Account is Approved 🎉", 
    htmlContent 
  });
}

/**
 * 7️⃣ Password Reset — sent when user requests password reset
 * @param {Object} user - User object
 * @param {string} user.email - User email
 * @param {string} user.name - User name
 * @param {string} user.resetLink - Password reset link with token
 */
async function sendPasswordReset(user) {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#ff9800,#f57c00);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Password Reset 🔐</h1>
      </div>
      
      <!-- Content -->
      <div style="padding:30px;">
        <p style="font-size:16px;color:#333;line-height:1.6;">Hi ${user.name},</p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          You requested to reset your Go7 password.
        </p>
        
        <p style="font-size:16px;color:#333;line-height:1.6;">
          Click below to set a new password. This link expires in <strong>15 minutes</strong>.
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="${user.resetLink}" 
             style="background:#ff9800;color:#fff;padding:14px 30px;
                    text-decoration:none;border-radius:6px;display:inline-block;
                    font-weight:bold;font-size:16px;">
            Reset Password
          </a>
        </div>
        
        <div style="background:#fff3e0;padding:15px;border-radius:6px;margin:20px 0;border-left:4px solid #ff9800;">
          <p style="margin:0;font-size:14px;color:#e65100;">
            ⚠️ If you didn't request this, please ignore this email or contact support.
          </p>
        </div>
        
        <p style="font-size:14px;color:#666;line-height:1.6;">
          Need help? Email us at <a href="mailto:support@go7.ng" style="color:#ff9800;">support@go7.ng</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f5f5f5;padding:20px;text-align:center;border-top:1px solid #ddd;">
        <p style="margin:0;font-size:12px;color:#999;">
          © 2025 Go7.ng — Deliver Everything ⚡<br>
          Abeokuta, Nigeria
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail({ 
    to: user.email,
    name: user.name,
    subject: "Reset Your Go7 Password 🔐", 
    htmlContent 
  });
}

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOutForDelivery,
  sendDeliveryComplete,
  sendBookDeliveryConfirmation,
  sendVendorApproved,
  sendPasswordReset,
};
