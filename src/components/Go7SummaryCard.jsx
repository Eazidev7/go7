// ==========================================================
// GO7 SUMMARY CARD – Animated Delivery Details
// ==========================================================

import React, { useEffect, useState } from 'react';
import { Bike, Clock, DollarSign } from 'lucide-react';
import '../styles/go7SummaryCard.css';
import { soundService } from '../services/soundService.js';

const Go7SummaryCard = ({ distance, eta, fare }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in after component mounts
        setTimeout(() => setIsVisible(true), 100);

        // Play sound effect (shared service: path + autoplay unlock + mute)
        soundService.play('success');

        // Haptic feedback for mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }, []);

    return (
        <div className={`go7-summary-card ${isVisible ? 'visible' : ''}`}>
            <h3 className="go7-summary-title">✨ Delivery Summary</h3>

            <div className="go7-summary-grid">
                <div className="go7-summary-item">
                    <div className="go7-summary-icon" style={{ background: '#FEE2E2' }}>
                        <Bike size={20} color="#E60023" />
                    </div>
                    <div className="go7-summary-content">
                        <span className="go7-summary-label">Distance</span>
                        <span className="go7-summary-value">{distance} km</span>
                    </div>
                </div>

                <div className="go7-summary-item">
                    <div className="go7-summary-icon" style={{ background: '#DBEAFE' }}>
                        <Clock size={20} color="#3B82F6" />
                    </div>
                    <div className="go7-summary-content">
                        <span className="go7-summary-label">ETA</span>
                        <span className="go7-summary-value">{eta}</span>
                    </div>
                </div>

                <div className="go7-summary-item">
                    <div className="go7-summary-icon" style={{ background: '#D1FAE5' }}>
                        <DollarSign size={20} color="#10B981" />
                    </div>
                    <div className="go7-summary-content">
                        <span className="go7-summary-label">Fare</span>
                        <span className="go7-summary-value go7-fare-highlight">₦{fare.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Go7SummaryCard;
