// GO7 BRANDED ANIMATED ALERTS + TOASTS
// ------------------------------------
// Sleek red-white-black style with emojis, sound, glow, and rider updates.

import Swal from "sweetalert2";
import Toastify from "toastify-js";
import "animate.css";
import "toastify-js/src/toastify.css";
import { soundService } from "../services/soundService.js";

// ✅ SOUND EFFECTS
// Every tone is played through the shared sound service, which owns the file
// paths, the browser autoplay unlock and the customer mute preference. The
// service never throws and never logs a failure to the console.
const playSound = (soundFile) => {
  const name = String(soundFile).split('/').pop().replace(/\.(mp3|wav)$/i, '');
  soundService.play(name);
};

// ✅ SUCCESS ALERT (for booking confirmations, payments, etc.)
export function showGo7Success(message, title = "✅ Delivery Confirmed!") {
  playSound("/sounds/success.mp3");
  
  return Swal.fire({
    title: title,
    text: message,
    icon: "success",
    background: "#fff",
    color: "#111",
    confirmButtonColor: "#E30613", // Go7 red
    confirmButtonText: "Awesome 🚀",
    buttonsStyling: true,
    customClass: {
      popup: 'go7-success-popup',
      title: 'go7-success-title',
      confirmButton: 'go7-success-button'
    },
    backdrop: `
      rgba(227, 6, 19, 0.25)
      left top
      no-repeat
    `,
    showClass: { 
      popup: "animate__animated animate__fadeInDown animate__faster" 
    },
    hideClass: { 
      popup: "animate__animated animate__fadeOutUp animate__faster" 
    },
    timer: 5000,
    timerProgressBar: true,
    allowOutsideClick: true,
    allowEscapeKey: true
  });
}

// ❌ ERROR ALERT (for GPS denied, payment failed, invalid address, etc.)
export function showGo7Error(message, title = "Oops!") {
  playSound("/sounds/error.mp3");
  
  return Swal.fire({
    icon: "error",
    title: title,
    text: message,
    background: "#fff",
    color: "#000",
    confirmButtonColor: "#E30613", // Go7 red
    confirmButtonText: "Retry 🔁",
    customClass: {
      popup: 'go7-error-popup',
      title: 'go7-error-title',
      confirmButton: 'go7-error-button'
    },
    backdrop: `
      rgba(227, 6, 19, 0.15)
      left top
      no-repeat
    `,
    showClass: { 
      popup: "animate__animated animate__shakeX animate__faster" 
    },
    hideClass: { 
      popup: "animate__animated animate__fadeOutUp animate__faster" 
    },
    allowOutsideClick: true,
    allowEscapeKey: true
  });
}

// ⚠️ WARNING ALERT (for location outside service area, etc.)
export function showGo7Warning(message, title = "⚠️ Notice") {
  playSound("/sounds/notify.mp3");
  
  return Swal.fire({
    icon: "warning",
    title: title,
    text: message,
    background: "#fff",
    color: "#000",
    confirmButtonColor: "#E30613", // Go7 red
    confirmButtonText: "Got it 👍",
    customClass: {
      popup: 'go7-warning-popup',
      title: 'go7-warning-title',
      confirmButton: 'go7-warning-button'
    },
    backdrop: `
      rgba(255, 176, 32, 0.20)
      left top
      no-repeat
    `,
    showClass: { 
      popup: "animate__animated animate__pulse animate__faster" 
    },
    hideClass: { 
      popup: "animate__animated animate__fadeOutUp animate__faster" 
    },
    allowOutsideClick: true,
    allowEscapeKey: true
  });
}

// 🚴 RIDER STATUS NOTIFICATION (Toast)
export function showRiderUpdate(status, duration = 4000) {
  playSound("/sounds/notify.mp3");
  
  return Toastify({
    text: `🛵 ${status}`,
    duration: duration,
    gravity: "bottom",
    position: "right",
    style: {
      background: "linear-gradient(90deg, rgba(227,6,19,1) 0%, rgba(255,100,100,1) 100%)",
      color: "#fff",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(227,6,19,0.4), 0 0 15px rgba(227,6,19,0.3)",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: "500",
      fontSize: "14px",
      padding: "12px 20px",
      border: "2px solid rgba(255,255,255,0.2)"
    },
    className: "go7-rider-toast",
    onClick: function() {
      console.log("Rider notification clicked");
    }
  }).showToast();
}

// 💰 PRICING UPDATE NOTIFICATION (Toast)
export function showPricingUpdate(newPrice, oldPrice = null) {
  const priceChange = oldPrice ? (newPrice > oldPrice ? "📈 increased" : "📉 decreased") : "";
  const message = oldPrice ? 
    `Price ${priceChange} to ₦${newPrice.toLocaleString()}` : 
    `Price updated: ₦${newPrice.toLocaleString()}`;

  return Toastify({
    text: `💰 ${message}`,
    duration: 3000,
    gravity: "top",
    position: "right",
    style: {
      background: "linear-gradient(90deg, rgba(34,197,94,1) 0%, rgba(76,175,80,1) 100%)",
      color: "#fff",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(34,197,94,0.3)",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: "500",
      fontSize: "14px",
      padding: "12px 20px",
      border: "2px solid rgba(255,255,255,0.2)"
    },
    className: "go7-pricing-toast"
  }).showToast();
}

// 🗺️ LOCATION UPDATE NOTIFICATION (Toast)
export function showLocationUpdate(message) {
  return Toastify({
    text: `📍 ${message}`,
    duration: 3000,
    gravity: "top",
    position: "left",
    style: {
      background: "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(99,102,241,1) 100%)",
      color: "#fff",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(59,130,246,0.3)",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: "500",
      fontSize: "14px",
      padding: "12px 20px",
      border: "2px solid rgba(255,255,255,0.2)"
    },
    className: "go7-location-toast"
  }).showToast();
}

// 📦 ORDER STATUS ALERT
export function showOrderStatus(status, orderId, riderName = null) {
  let title = "📦 Order Update";
  let message = "";
  let icon = "info";

  switch(status) {
    case "confirmed":
      title = "✅ Order Confirmed!";
      message = `Order #${orderId} has been confirmed and a rider will be assigned shortly.`;
      icon = "success";
      break;
    case "rider_assigned":
      title = "🚴 Rider Assigned!";
      message = riderName ? 
        `${riderName} has been assigned to your order #${orderId}` :
        `A rider has been assigned to your order #${orderId}`;
      icon = "success";
      break;
    case "pickup":
      title = "📦 Package Picked Up";
      message = `Your package has been picked up and is on the way to the destination.`;
      icon = "info";
      break;
    case "delivered":
      title = "🎉 Delivery Complete!";
      message = `Order #${orderId} has been successfully delivered. Thank you for using Go7!`;
      icon = "success";
      break;
    case "cancelled":
      title = "❌ Order Cancelled";
      message = `Order #${orderId} has been cancelled. If you have any questions, please contact support.`;
      icon = "error";
      break;
    default:
      message = `Order #${orderId} status: ${status}`;
  }

  return showGo7Success(message, title);
}

// 🔊 GENERAL TOAST NOTIFICATION
export function showGo7Toast(message, type = "info", position = "top-right") {
  const typeConfig = {
    success: {
      background: "linear-gradient(90deg, rgba(34,197,94,1) 0%, rgba(76,175,80,1) 100%)",
      emoji: "✅"
    },
    error: {
      background: "linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(220,38,38,1) 100%)",
      emoji: "❌"
    },
    warning: {
      background: "linear-gradient(90deg, rgba(245,158,11,1) 0%, rgba(217,119,6,1) 100%)",
      emoji: "⚠️"
    },
    info: {
      background: "linear-gradient(90deg, rgba(227,6,19,1) 0%, rgba(255,100,100,1) 100%)",
      emoji: "ℹ️"
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  
  // Validate position is a string with the correct format
  const validPosition = typeof position === 'string' && position.includes('-') 
    ? position 
    : 'top-right';
  
  const [gravity, pos] = validPosition.split("-");

  return Toastify({
    text: `${config.emoji} ${message}`,
    duration: 3000,
    gravity: gravity === "top" ? "top" : "bottom",
    position: pos === "left" ? "left" : pos === "center" ? "center" : "right",
    style: {
      background: config.background,
      color: "#fff",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: "500",
      fontSize: "14px",
      padding: "12px 20px",
      border: "2px solid rgba(255,255,255,0.2)"
    },
    className: `go7-toast go7-toast-${type}`
  }).showToast();
}

// 🧠 USAGE EXAMPLES:
// showGo7Success("Your delivery has been booked successfully!");
// showGo7Error("Unable to detect your current location. Please enable GPS.");
// showGo7Warning("This location is outside our service area.");
// showRiderUpdate("Rider Akeem is on the way 🚦");
// showPricingUpdate(1500, 1200);
// showLocationUpdate("Pickup location updated");
// showOrderStatus("rider_assigned", "GO7001", "Akeem O.");
// showGo7Toast("Settings saved successfully!", "success");