// ==========================================================
// GO7 MODERN ALERTS SYSTEM – Usage Guide & Examples
// ==========================================================

import {
    showBookingSuccess,
    showRiderAssigned,
    showRiderEnroute,
    showDeliveryCompleted,
    showInvalidAddress,
    showRiderAtPickup,
    showRiderAtDropoff,
    showBookingProcessing
} from '../utils/modernAlerts';

import { generateBookingId } from '../utils/bookingIdGenerator';

// ==========================================================
// 📚 COMPLETE DELIVERY FLOW EXAMPLE
// ==========================================================

export async function exampleDeliveryFlow() {

    // STEP 1: Generate booking ID
    const bookingId = generateBookingId();
    console.log('Booking ID:', bookingId); // Example: Go7-91K38A7

    // STEP 2: Show processing indicator
    const processingToast = showBookingProcessing();

    // Simulate booking API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Hide processing
    processingToast.hideToast();

    // STEP 3: Show booking success with track button
    await showBookingSuccess(bookingId, (id) => {
        console.log('User wants to track:', id);
        // Navigate to tracking page
        window.location.href = `/track/${id}`;
    });

    // STEP 4: Rider assigned notification (after ~30 seconds)
    setTimeout(() => {
        showRiderAssigned('Akeem'); // With rider name
        // or
        // showRiderAssigned(); // Without rider name
    }, 30000);

    // STEP 5: Rider enroute notification
    setTimeout(() => {
        showRiderEnroute('12-15 mins'); // With ETA
        // or
        // showRiderEnroute(); // Without ETA
    }, 60000);

    // STEP 6: Rider at pickup location
    setTimeout(() => {
        showRiderAtPickup();
    }, 120000);

    // STEP 7: Rider at dropoff location
    setTimeout(() => {
        showRiderAtDropoff();
    }, 180000);

    // STEP 8: Delivery completed
    setTimeout(() => {
        showDeliveryCompleted(bookingId);
    }, 240000);
}

// ==========================================================
// 🛠️ INDIVIDUAL ALERT EXAMPLES
// ==========================================================

export function alertExamples() {

    // ✅ Booking Success
    showBookingSuccess('Go7-XYZ123', (bookingId) => {
        console.log('Track order:', bookingId);
    });

    // 🚴 Rider Assigned
    showRiderAssigned('Kunle');

    // 📍 Rider Enroute
    showRiderEnroute('10 mins');

    // ✅ Delivery Complete
    showDeliveryCompleted('Go7-ABC456');

    // ❌ Invalid Address
    showInvalidAddress("We couldn't find that address");

    // 🎯 Rider at Pickup
    showRiderAtPickup();

    // 🎁 Rider at Dropoff
    showRiderAtDropoff();

    // ⏳ Processing
    const toast = showBookingProcessing();
    // Later: toast.hideToast();
}

// ==========================================================
// 🔥 REAL-TIME ORDER STATUS UPDATES
// ==========================================================

export function setupOrderStatusListener(bookingId) {
    // Example with Firebase Firestore listener

    const unsubscribe = db.collection('bookings')
        .doc(bookingId)
        .onSnapshot((snapshot) => {
            const data = snapshot.data();
            const status = data.status;

            switch (status) {
                case 'rider_assigned':
                    showRiderAssigned(data.riderName);
                    break;

                case 'rider_enroute':
                    showRiderEnroute(data.eta);
                    break;

                case 'at_pickup':
                    showRiderAtPickup();
                    break;

                case 'at_dropoff':
                    showRiderAtDropoff();
                    break;

                case 'delivered':
                    showDeliveryCompleted(bookingId);
                    unsubscribe(); // Stop listening
                    break;

                default:
                    console.log('Status:', status);
            }
        });

    return unsubscribe;
}

// ==========================================================
// 🎨 CUSTOMIZATION EXAMPLES
// ==========================================================

// You can also use SweetAlert2 directly for custom alerts
import Swal from 'sweetalert2';

export function customAlert() {
    Swal.fire({
        title: 'Custom Title',
        text: 'Custom message here',
        icon: 'info',
        confirmButtonColor: '#E60023',
        confirmButtonText: 'Got it!',
        customClass: {
            popup: 'my-custom-popup'
        }
    });
}

// Or use Toastify for custom toasts
import Toastify from 'toastify-js';

export function customToast() {
    Toastify({
        text: 'Custom toast message',
        duration: 3000,
        gravity: 'bottom',
        position: 'right',
        style: {
            background: '#E60023',
            borderRadius: '12px'
        }
    }).showToast();
}

// ==========================================================
// 📱 MOBILE-SPECIFIC ENHANCEMENTS
// ==========================================================

export function mobileEnhancements() {
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }

    // Play sound
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio not available'));

    // Show notification permission prompt
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

export default {
    exampleDeliveryFlow,
    alertExamples,
    setupOrderStatusListener,
    customAlert,
    customToast,
    mobileEnhancements
};
