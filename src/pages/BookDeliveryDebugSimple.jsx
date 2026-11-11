import React, { useRef, useEffect } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

const BookDeliveryDebugSimple = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        console.log('BookDeliveryDebugSimple mounted');
        console.log('mapRef.current:', mapRef.current);

        if (mapRef.current && !mapInstanceRef.current) {
            try {
                console.log('Initializing MapTiler map...');

                // Configure MapTiler SDK
                maptilersdk.config.apiKey = 'nRGZ9lGblbV9lFK2KclL';

                // Create MapTiler map instance
                mapInstanceRef.current = new maptilersdk.Map({
                    container: mapRef.current,
                    style: 'https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/style.json?key=nRGZ9lGblbV9lFK2KclL',
                    center: [3.3619, 7.1475], // [lng, lat] for Abeokuta
                    zoom: 13
                });

                mapInstanceRef.current.on('load', () => {
                    console.log('✅ Map loaded successfully!');
                });

                mapInstanceRef.current.on('error', (e) => {
                    console.error('❌ Map error:', e);
                });

            } catch (error) {
                console.error('❌ Error creating map:', error);
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-red-600 mb-4">BookDelivery Debug - Simple Map Test</h1>

                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <h2 className="text-lg font-semibold mb-2">Map Status</h2>
                    <p>Check the browser console for detailed logs.</p>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h2 className="text-lg font-semibold">Interactive Map</h2>
                    </div>

                    <div
                        ref={mapRef}
                        className="w-full h-96 relative"
                        style={{
                            minHeight: '400px',
                            backgroundColor: '#f0f0f0'
                        }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <div>Loading map...</div>
                                <div className="mt-2 text-sm">
                                    If this message persists, check the console for errors.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800">Debug Info</h3>
                    <ul className="mt-2 text-sm text-yellow-700">
                        <li>• MapTiler API Key: nRGZ9lGblbV9lFK2KclL</li>
                        <li>• Style ID: 019996dd-306b-7019-acc5-de8469c0388d</li>
                        <li>• Center: Abeokuta [7.1475, 3.3619]</li>
                        <li>• Zoom: 13</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default BookDeliveryDebugSimple;