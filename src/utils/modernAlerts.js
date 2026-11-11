// ==========================================================
// GO7 MODERN ALERTS – SweetAlert2 + Toastify Notifications
// ==========================================================

import Swal from 'sweetalert2';
import Toastify from 'toastify-js';
import confetti from 'canvas-confetti';
import { formatBookingIdDisplay } from './bookingIdGenerator';
import 'toastify-js/src/toastify.css';
import { soundService } from '../services/soundService.js';


/**
 * Play a Go7 tone through the shared sound service, which owns the file paths,
 * the browser autoplay unlock and the customer mute preference.
 */
function playTone(name) {
    soundService.play(name);
}

// ==========================================================
// 1️⃣ BOOKING SUCCESS ALERT
// ==========================================================
export function showBookingSuccess(bookingId, onTrackOrder) {
    // 🎉 Launch confetti celebration!
    const launchConfetti = () => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            colors: ['#E60023', '#FF4444', '#FFB3B3', '#FEE2E2', '#10B981', '#F59E0B']
        };

        function fire(particleRatio, opts) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
                spread: 100,
                startVelocity: 55
            });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    };

    return Swal.fire({
        title: '🎉 Booking Confirmed!',
        html: `
      <p style="font-size: 1rem; color: #374151; margin-bottom: 1rem;">
        Your Go7 rider is on the way 🚴
      </p>
      <div style="margin: 1rem 0;">
        <p style="font-size: 0.875rem; color: #6B7280; margin-bottom: 0.5rem;">
          Your Booking ID:
        </p>
        ${formatBookingIdDisplay(bookingId)}
        <p style="font-size: 0.75rem; color: #9CA3AF; margin-top: 0.5rem;">
          📋 Click to copy
        </p>
      </div>
    `,
        icon: 'success',
        iconColor: '#10B981',
        confirmButtonColor: '#E60023',
        confirmButtonText: '📍 Track Order',
        showCancelButton: true,
        cancelButtonText: 'Done',
        cancelButtonColor: '#6B7280',
        backdrop: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'go7-booking-success-popup',
            confirmButton: 'go7-track-button',
            cancelButton: 'go7-done-button'
        },
        didOpen: () => {
            // 🎊 Launch confetti!
            launchConfetti();

            // Additional confetti bursts
            setTimeout(launchConfetti, 300);

            // Play success sound
            playTone('success');

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }
        }
    }).then((result) => {
        if (result.isConfirmed && onTrackOrder) {
            onTrackOrder(bookingId);
        }
    });
}

// ==========================================================
// 2️⃣ RIDER ASSIGNED TOAST
// ==========================================================
export function showRiderAssigned(riderName = null) {
    const message = riderName
        ? `Rider ${riderName} matched! 🚴 Hang tight, they're packing up your order 😄`
        : "Rider matched! 🚴 Hang tight, they're packing up your order 😄";

    Toastify({
        text: message,
        duration: 4000,
        gravity: 'top',
        position: 'right',
        style: {
            background: 'linear-gradient(135deg, #E60023 0%, #FF4444 100%)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(230, 0, 35, 0.25)',
            fontFamily: "'Inter', 'Poppins', sans-serif"
        },
        stopOnFocus: true,
        onClick: function () { }
    }).showToast();

    // Play notification sound
    playTone('notify');
}

// ==========================================================
// 3️⃣ RIDER ENROUTE TOAST
// ==========================================================
export function showRiderEnroute(eta = null) {
    const message = eta
        ? `📍 Rider is on the move! ETA: ${eta} 🗺️`
        : '📍 Rider is on the move! Track in real-time 🗺️';

    Toastify({
        text: message,
        duration: 4500,
        gravity: 'top',
        position: 'right',
        style: {
            background: 'linear-gradient(135deg, #FFB3B3 0%, #FF6B6B 100%)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(255, 107, 107, 0.25)',
            color: '#8B0000',
            fontFamily: "'Inter', 'Poppins', sans-serif"
        },
        stopOnFocus: true
    }).showToast();
}

// ==========================================================
// 4️⃣ DELIVERY COMPLETED ALERT
// ==========================================================
export function showDeliveryCompleted(bookingId) {
    // 🎉 Celebration confetti!
    const celebrateDelivery = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // Left side confetti
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#E60023', '#FF4444', '#FFB3B3', '#10B981']
            });

            // Right side confetti
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#E60023', '#FF4444', '#FFB3B3', '#10B981']
            });
        }, 250);
    };

    return Swal.fire({
        title: '✅ Delivered Successfully!',
        html: `
      <p style="font-size: 1rem; color: #374151; margin-bottom: 1rem;">
        Thanks for trusting Go7 ❤️
      </p>
      <p style="font-size: 0.875rem; color: #6B7280;">
        Booking ID: <span style="color: #E60023; font-weight: 700;">${bookingId}</span>
      </p>
    `,
        icon: 'success',
        iconColor: '#10B981',
        confirmButtonColor: '#E60023',
        confirmButtonText: '⭐ Rate Rider',
        showCancelButton: true,
        cancelButtonText: 'Close',
        cancelButtonColor: '#6B7280',
        customClass: {
            popup: 'go7-delivery-complete-popup'
        },
        didOpen: () => {
            // 🎊 Launch celebration confetti!
            celebrateDelivery();

            // Play success sound
            playTone('success');

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 300]);
            }
        }
    });
}

// ==========================================================
// 5️⃣ ERROR / INVALID ADDRESS ALERT
// ==========================================================
export function showInvalidAddress(message = null) {
    return Swal.fire({
        title: '😕 Oops!',
        text: message || "We couldn't find that address. Try a nearby landmark.",
        icon: 'error',
        iconColor: '#EF4444',
        confirmButtonColor: '#E60023',
        confirmButtonText: 'Try Again',
        customClass: {
            popup: 'go7-error-popup'
        }
    });
}

// ==========================================================
// 6️⃣ RIDER AT PICKUP LOCATION
// ==========================================================
export function showRiderAtPickup() {
    Toastify({
        text: '🎯 Rider has arrived at pickup! Handing over your package now...',
        duration: 4000,
        gravity: 'top',
        position: 'center',
        style: {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
            fontFamily: "'Inter', 'Poppins', sans-serif"
        },
        stopOnFocus: true
    }).showToast();

    // Play notification sound
    playTone('notify');
}

// ==========================================================
// 7️⃣ RIDER AT DROPOFF LOCATION
// ==========================================================
export function showRiderAtDropoff() {
    Toastify({
        text: '🎁 Rider is at your location! Please collect your package 📦',
        duration: 5000,
        gravity: 'top',
        position: 'center',
        style: {
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: '700',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
            fontFamily: "'Inter', 'Poppins', sans-serif"
        },
        stopOnFocus: true
    }).showToast();

    // Play notification sound
    playTone('notify');

    // Vibrate
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
}

// ==========================================================
// 8️⃣ BOOKING PROCESSING TOAST
// ==========================================================
export function showBookingProcessing() {
    return Toastify({
        text: '⏳ Processing your booking...',
        duration: -1, // Keep showing until dismissed
        gravity: 'bottom',
        position: 'center',
        style: {
            background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            fontFamily: "'Inter', 'Poppins', sans-serif"
        },
        stopOnFocus: true
    }).showToast();
}
