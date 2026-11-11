import Swal from 'sweetalert2';
import trackingService from './TrackingDataService';

/**
 * Notification Service for Go7 Tracking System
 * Handles push notifications, sound alerts, and user notifications
 */

class NotificationService {
  constructor() {
    this.soundEnabled = true;
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    this.sounds = this.initializeSounds();
    this.permissionGranted = false;

    this.init();
  }

  // Initialize the service
  async init() {
    await this.requestNotificationPermission();
    this.setupSwalDefaults();
    console.log('🔔 Go7 Notification Service initialized');
  }

  // Initialize sound effects
  initializeSounds() {
    const sounds = {
      newOrder: this.createSound(800, 0.3, 'sine'), // High ping for new orders
      statusUpdate: this.createSound(600, 0.2, 'triangle'), // Medium tone for updates
      completion: this.createSound([523, 659, 784], 0.4, 'sine'), // Success chord
      alert: this.createSound(400, 0.5, 'sawtooth'), // Alert tone
      message: this.createSound(700, 0.1, 'sine') // Quick notification
    };

    return sounds;
  }

  // Create Web Audio API sound
  createSound(frequency, volume = 0.3, type = 'sine') {
    return () => {
      if (!this.soundEnabled) return;

      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (Array.isArray(frequency)) {
          // Play chord for success sounds
          frequency.forEach((freq, index) => {
            setTimeout(() => {
              this.playTone(audioContext, freq, volume, type, 0.3);
            }, index * 100);
          });
        } else {
          this.playTone(audioContext, frequency, volume, type, 0.5);
        }
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    };
  }

  // Play individual tone
  playTone(audioContext, frequency, volume, type, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  // Request notification permissions
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }
    return false;
  }

  // Setup SweetAlert2 defaults
  setupSwalDefaults() {
    Swal.mixin({
      customClass: {
        container: 'go7-notification',
        popup: 'go7-popup',
        header: 'go7-header',
        title: 'go7-title',
        closeButton: 'go7-close-button',
        icon: 'go7-icon',
        image: 'go7-image',
        content: 'go7-content',
        input: 'go7-input',
        actions: 'go7-actions',
        confirmButton: 'go7-confirm-button',
        cancelButton: 'go7-cancel-button',
        footer: 'go7-footer'
      },
      buttonsStyling: false,
      confirmButtonText: 'OK',
      showCloseButton: true,
      timer: 5000,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: true
    });
  }

  // Show new order notification (for riders)
  async showNewOrderNotification(orderData) {
    this.sounds.newOrder();

    const result = await Swal.fire({
      title: '🚚 New Delivery Order!',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="font-semibold text-red-800">Order #${orderData.id.slice(-8)}</p>
            <p class="text-lg font-bold text-red-600">₦${orderData.total?.toLocaleString()}</p>
          </div>
          <div class="text-sm space-y-2">
            <p><span class="font-medium">📍 Pickup:</span> ${orderData.pickupAddress}</p>
            <p><span class="font-medium">🏁 Dropoff:</span> ${orderData.dropoffAddress}</p>
            <p><span class="font-medium">📱 Customer:</span> ${orderData.senderPhone || 'N/A'}</p>
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '✅ Accept Order',
      cancelButtonText: '❌ Decline',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
      timer: 30000, // 30 second auto-decline
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: 'animate__animated animate__pulse'
      }
    });

    return result.isConfirmed;
  }

  // Show status update notification
  showStatusUpdateNotification(orderData, newStatus) {
    this.sounds.statusUpdate();

    const statusMessages = {
      assigned: 'Order assigned to rider',
      pickup: 'Order picked up',
      enroute: 'On the way to destination',
      delivered: 'Order delivered successfully'
    };

    const statusIcons = {
      assigned: '👤',
      pickup: '📦',
      enroute: '🚚',
      delivered: '✅'
    };

    Swal.fire({
      title: `${statusIcons[newStatus]} Order Status Updated`,
      text: statusMessages[newStatus] || `Status updated to ${newStatus}`,
      icon: newStatus === 'delivered' ? 'success' : 'info',
      confirmButtonColor: '#E30613',
      timer: 3000,
      customClass: {
        popup: 'animate__animated animate__bounceIn'
      }
    });

    // Send browser notification if permitted
    this.sendBrowserNotification(
      'Go7 Delivery Update',
      `Order #${orderData.id.slice(-8)} - ${statusMessages[newStatus]}`,
      '/go7-logo.png'
    );
  }

  // Show delivery completion notification
  showDeliveryCompletedNotification(orderData) {
    this.sounds.completion();

    Swal.fire({
      title: '🎉 Delivery Completed!',
      html: `
        <div class="text-center space-y-4">
          <div class="text-6xl">🏆</div>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-lg font-semibold text-green-800">Order #${orderData.id.slice(-8)}</p>
            <p class="text-2xl font-bold text-green-600">₦${orderData.total?.toLocaleString()}</p>
          </div>
          <p class="text-gray-600">Thank you for using Go7 delivery!</p>
        </div>
      `,
      icon: 'success',
      confirmButtonText: '🌟 Rate Your Experience',
      confirmButtonColor: '#10B981',
      timer: 10000,
      customClass: {
        popup: 'animate__animated animate__tada'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.showRatingDialog(orderData);
      }
    });
  }

  // Show rating dialog
  async showRatingDialog(orderData) {
    const { value: rating } = await Swal.fire({
      title: 'Rate Your Delivery Experience',
      html: `
        <div class="space-y-4">
          <p class="text-gray-600">How was your delivery experience?</p>
          <div class="flex justify-center space-x-2" id="rating-stars">
            ${[1, 2, 3, 4, 5].map(star =>
        `<button type="button" class="text-3xl text-gray-300 hover:text-yellow-400 transition-colors" data-rating="${star}">⭐</button>`
      ).join('')}
          </div>
          <textarea 
            id="rating-comment" 
            placeholder="Optional feedback..." 
            class="w-full p-3 border border-gray-300 rounded-lg resize-none"
            rows="3"
          ></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Submit Rating',
      cancelButtonText: 'Skip',
      confirmButtonColor: '#E30613',
      preConfirm: () => {
        const selectedRating = document.querySelector('[data-rating].selected')?.dataset.rating;
        const comment = document.getElementById('rating-comment').value;

        if (!selectedRating) {
          Swal.showValidationMessage('Please select a rating');
          return false;
        }

        return { rating: parseInt(selectedRating), comment };
      },
      didOpen: () => {
        // Add click handlers for rating stars
        document.querySelectorAll('[data-rating]').forEach(star => {
          star.addEventListener('click', (e) => {
            const rating = parseInt(e.target.dataset.rating);
            document.querySelectorAll('[data-rating]').forEach((s, index) => {
              s.classList.toggle('selected', index < rating);
              s.style.color = index < rating ? '#FCD34D' : '#D1D5DB';
            });
          });
        });
      }
    });

    if (rating) {
      // Save rating to Firestore
      await trackingService.updateOrderStatus(orderData.id, 'rated', {
        rating: rating.rating,
        comment: rating.comment,
        ratedAt: new Date()
      });

      Swal.fire({
        icon: 'success',
        title: 'Thank You!',
        text: 'Your feedback helps us improve our service.',
        timer: 2000,
        confirmButtonColor: '#E30613'
      });
    }
  }

  // Show ETA update notification
  showETAUpdateNotification(eta, distance) {
    this.sounds.message();

    const toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      customClass: {
        popup: 'go7-toast'
      }
    });

    toast.fire({
      icon: 'info',
      title: `📍 ETA Updated: ${eta} min (${distance.toFixed(1)}km)`
    });
  }

  // Show error notification
  showErrorNotification(title, message) {
    this.sounds.alert();

    Swal.fire({
      icon: 'error',
      title: title || 'Something went wrong',
      text: message || 'Please try again or contact support.',
      confirmButtonColor: '#E30613',
      customClass: {
        popup: 'animate__animated animate__shake'
      }
    });
  }

  // Show success notification
  showSuccessNotification(title, message, timer = 3000) {
    this.sounds.statusUpdate();

    Swal.fire({
      icon: 'success',
      title: title || 'Success!',
      text: message,
      timer: timer,
      confirmButtonColor: '#10B981',
      customClass: {
        popup: 'animate__animated animate__bounceIn'
      }
    });
  }

  // Show loading notification
  showLoadingNotification(title = 'Processing...', message = 'Please wait') {
    Swal.fire({
      title: title,
      text: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  // Close loading notification
  closeLoadingNotification() {
    Swal.close();
  }

  // Send browser notification
  sendBrowserNotification(title, body, icon = '/go7-logo.png') {
    if (this.permissionGranted && 'Notification' in window) {
      try {
        new Notification(title, {
          body: body,
          icon: icon,
          badge: icon,
          tag: 'go7-delivery',
          requireInteraction: false,
          silent: false
        });
      } catch (error) {
        console.warn('Browser notification failed:', error);
      }
    }
  }

  // Queue notification for batch processing
  queueNotification(notification) {
    this.notificationQueue.push({
      ...notification,
      timestamp: Date.now()
    });

    if (!this.isProcessingQueue) {
      this.processNotificationQueue();
    }
  }

  // Process notification queue
  async processNotificationQueue() {
    this.isProcessingQueue = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();

      // Process different notification types
      switch (notification.type) {
        case 'new_order':
          await this.showNewOrderNotification(notification.data);
          break;
        case 'status_update':
          this.showStatusUpdateNotification(notification.data, notification.status);
          break;
        case 'delivery_completed':
          this.showDeliveryCompletedNotification(notification.data);
          break;
        case 'eta_update':
          this.showETAUpdateNotification(notification.eta, notification.distance);
          break;
        case 'error':
          this.showErrorNotification(notification.title, notification.message);
          break;
        case 'success':
          this.showSuccessNotification(notification.title, notification.message);
          break;
        default:
          console.warn('Unknown notification type:', notification.type);
      }

      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessingQueue = false;
  }

  // Toggle sound on/off
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;

    const toast = Swal.mixin({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 2000
    });

    toast.fire({
      icon: this.soundEnabled ? 'success' : 'info',
      title: `Sound ${this.soundEnabled ? 'Enabled' : 'Disabled'}`
    });

    return this.soundEnabled;
  }

  // Get sound status
  isSoundEnabled() {
    return this.soundEnabled;
  }

  // Setup real-time notification listeners
  setupRealTimeNotifications(userId, userType) {
    // Listen for notifications specific to this user
    trackingService.listenToUserNotifications(
      userId,
      (notifications) => {
        notifications.forEach(notification => {
          this.queueNotification({
            type: notification.type,
            data: notification.data,
            title: notification.title,
            message: notification.message
          });

          // Mark as read after showing
          trackingService.markNotificationAsRead(notification.id);
        });
      }
    );
  }

  // Show confirmation dialog
  async showConfirmationDialog(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    const result = await Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#E30613',
      cancelButtonColor: '#6B7280',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });

    return result.isConfirmed;
  }

  // Show custom HTML dialog
  async showCustomDialog(config) {
    return await Swal.fire({
      ...config,
      customClass: {
        popup: 'go7-custom-dialog',
        ...config.customClass
      }
    });
  }

  // Cleanup listeners
  cleanup() {
    // Stop all tracking listeners if trackingService is available
    if (trackingService && typeof trackingService.stopAllListeners === 'function') {
      trackingService.stopAllListeners();
    }
    console.log('🔔 Notification service cleaned up');
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;

// Export individual methods for convenience
export const {
  showNewOrderNotification,
  showStatusUpdateNotification,
  showDeliveryCompletedNotification,
  showErrorNotification,
  showSuccessNotification,
  showLoadingNotification,
  closeLoadingNotification,
  sendBrowserNotification,
  queueNotification,
  toggleSound,
  isSoundEnabled,
  setupRealTimeNotifications,
  showConfirmationDialog,
  showCustomDialog
} = notificationService;

// CSS for Go7 themed notifications (to be added to main CSS)
export const notificationStyles = `
.go7-notification {
  font-family: 'Inter', sans-serif;
}

.go7-popup {
  border-radius: 1rem !important;
  border: 2px solid #FEE2E2 !important;
}

.go7-title {
  color: #1F2937 !important;
  font-weight: 600 !important;
}

.go7-confirm-button {
  background: linear-gradient(135deg, #E30613 0%, #B91C1C 100%) !important;
  color: white !important;
  border: none !important;
  border-radius: 0.5rem !important;
  padding: 0.75rem 1.5rem !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

.go7-confirm-button:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 10px 25px rgba(227, 6, 19, 0.3) !important;
}

.go7-cancel-button {
  background: #6B7280 !important;
  color: white !important;
  border: none !important;
  border-radius: 0.5rem !important;
  padding: 0.75rem 1.5rem !important;
  font-weight: 600 !important;
}

.go7-toast {
  border-left: 4px solid #E30613 !important;
}

.animate__animated {
  animation-duration: 0.5s !important;
}

@keyframes go7-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.go7-custom-dialog {
  animation: go7-pulse 0.6s ease-in-out !important;
}
`;