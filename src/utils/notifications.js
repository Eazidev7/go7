import Swal from 'sweetalert2';
import { soundService } from '../services/soundService.js';

// Go7 theme configuration for notifications
const GO7_THEME = {
    confirmButtonColor: '#E30613',
    background: '#fff',
    color: '#0F172A',
    showClass: {
        popup: 'animate__animated animate__bounceIn'
    },
    hideClass: {
        popup: 'animate__animated animate__fadeOut'
    }
};

// Toast configuration
const TOAST_CONFIG = {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: '#FFF5F2',
    ...GO7_THEME
};

// Sound effect for notifications
// Delegates to the shared sound service, which owns the file paths, the browser
// autoplay unlock and the customer mute preference.
const playNotificationSound = () => {
    soundService.play('notification');
};

// Order confirmation popup
export const showOrderConfirmed = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Order Locked In 🍱',
        text: 'Hang tight! Your Go7 rider is warming up the engine 🚴‍♂️',
        icon: 'success',
        ...GO7_THEME
    });
};

// Rider started moving notification
export const showRiderStarted = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Your order just hit the road 🛵💨',
        text: "We're zipping through Abeokuta traffic for you!",
        ...TOAST_CONFIG
    });
};

// Pickup notification
export const showPickupComplete = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Grabbed your item 🎒',
        text: "Your Go7 hero's got it safe and sound.",
        ...TOAST_CONFIG
    });
};

// Halfway notification
export const showHalfwayPoint = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Halfway there 🚦',
        text: 'Cruising past Panseke in record time!',
        ...TOAST_CONFIG
    });
};

// Near destination notification
export const showNearDestination = () => {
    playNotificationSound();
    return Swal.fire({
        title: "We're around the corner 👋",
        text: "Keep your phone close — Go7's almost home.",
        ...TOAST_CONFIG
    });
};

// Delivery complete notification
export const showDeliveryComplete = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Delivered ✨',
        text: "Hope you're smiling already 😋 — thanks for choosing Go7!",
        icon: 'success',
        ...GO7_THEME
    });
};

// Status history map for notifications
export const STATUS_NOTIFICATIONS = {
    started: showRiderStarted,
    picked_up: showPickupComplete,
    halfway: showHalfwayPoint,
    near_destination: showNearDestination,
    delivered: showDeliveryComplete
};

// Enhanced rider status notifications with local Abeokuta flavor
export const showRiderPickedUp = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Picked Up 🎒',
        text: "Your Go7 hero just grabbed your order!",
        ...TOAST_CONFIG
    });
};

export const showRiderEnroute = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Enroute 🛵💨',
        text: "We're cruising through Abeokuta — almost there!",
        ...TOAST_CONFIG
    });
};

export const showRiderArriving = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Arriving 👋',
        text: "Go7 is right around the corner!",
        ...TOAST_CONFIG
    });
};

export const showOrderDelivered = () => {
    playNotificationSound();
    return Swal.fire({
        title: 'Delivered ✨',
        text: "Order complete — thanks for trusting Go7!",
        icon: 'success',
        ...GO7_THEME
    });
};

// Reconnection notification
export const showReconnecting = () => {
    return Swal.fire({
        title: 'Reconnecting to rider… 🚦',
        text: 'Hang tight while we restore the connection!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        background: '#FEF3C7',
        confirmButtonColor: '#E30613'
    });
};