import React, { useState, useEffect } from 'react';
import realtimeTrackingService from '../services/realtimeTracking';

const FirebaseStatusIndicator = ({ className = '' }) => {
    const [status, setStatus] = useState(realtimeTrackingService.getStatus());

    useEffect(() => {
        // Update status every 5 seconds
        const interval = setInterval(() => {
            setStatus(realtimeTrackingService.getStatus());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    if (!status.online) {
        return (
            <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Demo Mode</span>
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Live Firebase</span>
            {status.listeners > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                    {status.listeners} active
                </span>
            )}
        </div>
    );
};

export default FirebaseStatusIndicator;