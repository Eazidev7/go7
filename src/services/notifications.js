// Notification service for Go7 real-time tracking
import Swal from 'sweetalert2';
import { soundService } from './soundService.js';

class NotificationService {
    constructor() {
        this.audioContext = null;
        this.sounds = {
            orderAssigned: '/sounds/order-assigned.mp3',
            statusUpdate: '/sounds/status-update.mp3',
            orderComplete: '/sounds/order-complete.mp3',
            locationUpdate: '/sounds/location-ping.mp3'
        };
        this.isEnabled = true;
        this.soundEnabled = true;

        this.initializeAudio();
    }

    // Initialize audio context
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio context not supported:', error);
        }
    }

    // Request notification permission
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.isEnabled = permission === 'granted';
            return permission === 'granted';
        }
        return false;
    }

    // Play notification sound
    playSound(soundType = 'statusUpdate') {
        if (!this.soundEnabled) return;

        // Routed through the shared sound service (path + autoplay unlock + mute).
        const path = this.sounds[soundType] || this.sounds.statusUpdate;
        const name = String(path).split('/').pop().replace(/\.(mp3|wav)$/i, '');

        try {
            soundService.play(name);
        } catch (error) {
            console.warn('Sound playback failed:', error);
        }
    }

    // Generate system beep
    playBeep(frequency = 800, duration = 200) {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (error) {
            console.warn('Beep generation failed:', error);
        }
    }

    // Show SweetAlert notification
    showToast(title, text, type = 'info', options = {}) {
        const typeConfig = {
            success: {
                iconColor: '#10b981',
                background: '#f0fdf4',
                color: '#166534'
            },
            error: {
                iconColor: '#ef4444',
                background: '#fef2f2',
                color: '#dc2626'
            },
            warning: {
                iconColor: '#f59e0b',
                background: '#fffbeb',
                color: '#d97706'
            },
            info: {
                iconColor: '#3b82f6',
                background: '#eff6ff',
                color: '#2563eb'
            }
        };

        return Swal.fire({
            title,
            text,
            icon: type,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            },
            ...typeConfig[type],
            ...options
        });
    }

    // Customer-specific notifications
    notifyCustomer = {
        orderAssigned: (riderInfo) => {
            this.playSound('orderAssigned');
            this.showToast(
                '🛵 Rider Assigned',
                `${riderInfo.name} is on the way to collect your package`,
                'success'
            );
        },

        riderAtPickup: (riderInfo) => {
            this.playSound('statusUpdate');
            this.showToast(
                '📦 Pickup in Progress',
                'Your rider has arrived and is collecting the package',
                'info'
            );
        },

        packageInTransit: (riderInfo, eta) => {
            this.playSound('statusUpdate');
            this.showToast(
                '🚚 In Transit',
                `Your package is on the way! Estimated arrival: ${eta}`,
                'success'
            );
        },

        packageDelivered: () => {
            this.playSound('orderComplete');
            this.showToast(
                '✅ Delivered!',
                'Your package has been successfully delivered',
                'success',
                { timer: 6000 }
            );
        },

        locationUpdate: (distance, eta) => {
            // Quiet notification for location updates
            this.showToast(
                '📍 Location Update',
                `Rider is ${distance} away (ETA: ${eta})`,
                'info',
                {
                    timer: 2000,
                    position: 'bottom-end'
                }
            );
        }
    };

    // Rider-specific notifications
    notifyRider = {
        newOrder: (orderInfo) => {
            this.playSound('orderAssigned');
            this.showToast(
                '📦 New Delivery',
                `Pickup: ${orderInfo.pickupAddress}`,
                'success'
            );
        },

        orderCancelled: (orderId) => {
            this.playSound('statusUpdate');
            this.showToast(
                '❌ Order Cancelled',
                `Order #${orderId} has been cancelled`,
                'warning'
            );
        },

        locationShareStarted: () => {
            this.showToast(
                '📍 GPS Active',
                'Your location is now being shared with customers',
                'success'
            );
        },

        locationShareStopped: () => {
            this.showToast(
                '📍 GPS Stopped',
                'Location sharing has been disabled',
                'info'
            );
        },

        deliveryCompleted: (earnings) => {
            this.playSound('orderComplete');
            this.showToast(
                '🎉 Delivery Complete!',
                `Great job! You earned ₦${earnings}`,
                'success',
                { timer: 5000 }
            );
        }
    };
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;