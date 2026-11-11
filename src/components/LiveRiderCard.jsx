import React from 'react';

/**
 * Floating status card component for live rider tracking
 * Displays rider status, ETA countdown, and distance remaining
 * 
 * @param {Object} props - Component props
 * @param {string} props.riderStatus - Current rider status
 * @param {Date} props.eta - Estimated arrival time
 * @param {number} props.distance - Distance remaining in km
 * @param {boolean} props.isConnected - Connection status
 * @param {string} props.className - Additional CSS classes
 */
export const LiveRiderCard = ({
    riderStatus = 'assigned',
    eta = null,
    distance = 0,
    isConnected = true,
    className = ''
}) => {

    /**
     * Format ETA as countdown string
     */
    const formatETA = (etaDate) => {
        if (!etaDate) return 'Calculating...';

        const now = new Date();
        const timeDiff = etaDate.getTime() - now.getTime();

        if (timeDiff <= 0) return 'Arriving now!';

        const minutes = Math.floor(timeDiff / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    /**
     * Get status display info
     */
    const getStatusInfo = (status) => {
        const statusMap = {
            assigned: {
                text: 'Rider Assigned 👋',
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200'
            },
            enroute: {
                text: 'En Route 🛵💨',
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                borderColor: 'border-purple-200'
            },
            picked_up: {
                text: 'Picked Up ✅',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200'
            },
            arriving: {
                text: 'Arriving Soon 📍',
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200'
            },
            delivered: {
                text: 'Delivered! 🎉',
                color: 'text-green-700',
                bgColor: 'bg-green-100',
                borderColor: 'border-green-300'
            }
        };

        return statusMap[status] || statusMap.assigned;
    };

    const statusInfo = getStatusInfo(riderStatus);

    return (
        <div className={`live-rider-card ${className}`}>
            <div className={`
                ${statusInfo.bgColor} 
                ${statusInfo.borderColor}
                backdrop-blur-sm 
                rounded-lg 
                shadow-lg 
                p-4 
                border-2
                max-w-xs
                transition-all 
                duration-300
            `}>
                {/* Connection Status Indicator */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className={`
                            w-2 h-2 rounded-full 
                            ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
                        `} />
                        <span className="text-xs text-gray-600">
                            {isConnected ? 'Live' : 'Reconnecting...'}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500">
                        Go7 Tracking
                    </div>
                </div>

                {/* Rider Status */}
                <div className="mb-3">
                    <div className={`
                        font-semibold text-sm
                        ${statusInfo.color}
                        flex items-center space-x-1
                    `}>
                        <span>{statusInfo.text}</span>
                    </div>
                </div>

                {/* ETA and Distance */}
                <div className="space-y-2">
                    {/* ETA Countdown */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                            ETA:
                        </span>
                        <span className="text-sm font-bold text-go7-red">
                            {formatETA(eta)}
                        </span>
                    </div>

                    {/* Distance Remaining */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                            Distance:
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                            {distance > 0 ? `${distance.toFixed(1)} km` : 'Calculating...'}
                        </span>
                    </div>
                </div>

                {/* Progress Bar (Optional) */}
                {distance > 0 && distance < 10 && (
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{Math.max(0, Math.min(100, (10 - distance) * 10)).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                                className="bg-go7-red h-1.5 rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.max(0, Math.min(100, (10 - distance) * 10))}%`
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveRiderCard;