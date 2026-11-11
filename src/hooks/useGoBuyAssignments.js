import { useState, useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { soundService } from '../services/soundService.js';

/**
 * Custom hook for managing GoBuy assignment notifications and state
 */
export const useGoBuyAssignments = (riderId) => {
    const [currentAssignment, setCurrentAssignment] = useState(null);
    const [assignmentVisible, setAssignmentVisible] = useState(false);
    const [assignmentHistory, setAssignmentHistory] = useState([]);

    useEffect(() => {
        if (!riderId) return;

        // Listen for real-time FCM notifications
        const unsubscribeMessaging = onMessage(messaging, (payload) => {
            console.log('🔔 FCM message received:', payload);

            if (payload.data?.type === 'assignment' && payload.data?.orderType === 'gobuy') {
                const assignmentData = {
                    orderId: payload.data.orderId,
                    riderId: payload.data.riderId,
                    riderMode: payload.data.riderMode || 'foot',
                    estimatedPayout: parseInt(payload.data.estimatedPayout) || 200,
                    distanceKm: parseFloat(payload.data.distanceKm) || 0,
                    timeout: parseInt(payload.data.timeout) || 30,
                    timestamp: Date.now()
                };

                console.log('🛍️ New GoBuy assignment received:', assignmentData);
                setCurrentAssignment(assignmentData);
                setAssignmentVisible(true);

                // Play notification sound (shared service: path + autoplay unlock + mute)
                soundService.play('notification');

                // Vibrate if supported
                if ('vibrate' in navigator) {
                    navigator.vibrate([200, 100, 200]);
                }
            }
        });

        // Listen for real-time updates to assignments collection
        let unsubscribeAssignments;

        try {
            const assignmentRef = doc(db, 'assignments', riderId);
            unsubscribeAssignments = onSnapshot(assignmentRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    console.log('📊 Assignment document updated:', data);

                    // Handle assignment status changes
                    if (data.status === 'cancelled' || data.status === 'reassigned') {
                        setCurrentAssignment(null);
                        setAssignmentVisible(false);
                    }
                }
            });
        } catch (error) {
            console.log('Assignment listener setup failed:', error);
        }

        return () => {
            if (unsubscribeMessaging) unsubscribeMessaging();
            if (unsubscribeAssignments) unsubscribeAssignments();
        };
    }, [riderId]);

    // Handle assignment acceptance
    const handleAccept = async (assignment) => {
        try {
            console.log('✅ Assignment accepted locally:', assignment.orderId);

            // Hide the assignment sheet
            setAssignmentVisible(false);

            // Add to history
            setAssignmentHistory(prev => [
                ...prev,
                { ...assignment, status: 'accepted', acceptedAt: Date.now() }
            ]);

            // Clear current assignment
            setCurrentAssignment(null);

            // Show success feedback
            showFeedback('Assignment accepted! Check your active orders.', 'success');

        } catch (error) {
            console.error('Error handling accept:', error);
            showFeedback('Failed to accept assignment', 'error');
        }
    };

    // Handle assignment decline
    const handleDecline = async (assignment) => {
        try {
            console.log('❌ Assignment declined locally:', assignment.orderId);

            // Hide the assignment sheet
            setAssignmentVisible(false);

            // Add to history
            setAssignmentHistory(prev => [
                ...prev,
                { ...assignment, status: 'declined', declinedAt: Date.now() }
            ]);

            // Clear current assignment
            setCurrentAssignment(null);

            // Show feedback
            showFeedback('Assignment declined', 'info');

        } catch (error) {
            console.error('Error handling decline:', error);
            showFeedback('Failed to decline assignment', 'error');
        }
    };

    // Handle assignment timeout
    const handleTimeout = async () => {
        try {
            console.log('⏰ Assignment timed out locally');

            if (currentAssignment) {
                // Add to history
                setAssignmentHistory(prev => [
                    ...prev,
                    { ...currentAssignment, status: 'timeout', timeoutAt: Date.now() }
                ]);
            }

            // Hide the assignment sheet
            setAssignmentVisible(false);
            setCurrentAssignment(null);

            // Show timeout feedback
            showFeedback('Assignment timed out', 'warning');

        } catch (error) {
            console.error('Error handling timeout:', error);
        }
    };

    // Dismiss assignment manually
    const dismissAssignment = () => {
        setAssignmentVisible(false);
        setCurrentAssignment(null);
    };

    // Show user feedback
    const showFeedback = (message, type = 'info') => {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium shadow-lg transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                    type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
            }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    };

    return {
        currentAssignment,
        assignmentVisible,
        assignmentHistory,
        handleAccept,
        handleDecline,
        handleTimeout,
        dismissAssignment
    };
};