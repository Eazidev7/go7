// GO7 UBER-STYLE LIVE TRACKING + CHAT FIX
// ----------------------------------------
// 1. Displays live delivery tracking map.
// 2. Rider moves between pickup and drop-off using coordinates.
// 3. Includes floating chat button linked to chat page.
// 4. Uses red Go7 theme (Uber-like interface).

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { database, db } from "../config/firebase";
import { ref, onValue } from "firebase/database";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import useETA from "../hooks/useETA";
import "./Go7UberTracking.css";

export default function Go7UberTracking() {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const riderMarkerRef = useRef(null);
    const navigate = useNavigate();
    const { orderId } = useParams();

    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Better mobile detection: check for touch support OR small screen
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const [isMobile, setIsMobile] = useState(isTouchDevice || window.innerWidth <= 1024);
    
    const [riderInfo, setRiderInfo] = useState({
        name: "Assigning rider...",
        rating: 4.9,
        eta: "Calculating...",
        status: "Processing"
    });

    const [orderStatus, setOrderStatus] = useState("pending");

    // Dynamic rider and dropoff positions for ETA calculation
    const [riderPos, setRiderPos] = useState({ lat: 7.145, lng: 3.357 });
    const [dropoffPos, setDropoffPos] = useState({ lat: 7.157, lng: 3.375 });

    // Detect mobile screen size
    useEffect(() => {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const handleResize = () => {
            const mobile = isTouchDevice || window.innerWidth <= 1024;
            console.log(`📱 Touch Device: ${isTouchDevice}, Screen: ${window.innerWidth}px, Mobile UI: ${mobile}`);
            setIsMobile(mobile);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 🚀 Use dynamic ETA hook
    const { eta: dynamicETA, distance, isLoading: etaLoading } = useETA(riderPos, dropoffPos);

    // Fetch booking data from Firestore
    useEffect(() => {
        const fetchBooking = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                console.log('🔍 Fetching booking:', orderId);
                
                // Try by document ID first
                let bookingSnap = await getDoc(doc(db, "bookings", orderId));
                
                // If not found, search by bookingId field
                if (!bookingSnap.exists()) {
                    console.log('ℹ️ Searching by bookingId field...');
                    const bookingsRef = collection(db, "bookings");
                    const q = query(bookingsRef, where("bookingId", "==", orderId));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        bookingSnap = querySnapshot.docs[0];
                    } else {
                        console.error('❌ Booking not found');
                        setLoading(false);
                        return;
                    }
                }

                const data = bookingSnap.data();
                console.log('✅ Booking data loaded:', data);
                setBookingData(data);
                
                // Set coordinates from booking
                if (data.dropoff?.coordinates) {
                    setDropoffPos({ lat: data.dropoff.coordinates.lat, lng: data.dropoff.coordinates.lng });
                }
                
                // Set status and rider info
                setOrderStatus(data.status || 'pending');
                if (data.riderName) {
                    setRiderInfo(prev => ({
                        ...prev,
                        name: data.riderName,
                        phone: data.riderPhone || prev.phone,
                        status: getStatusText(data.status)
                    }));
                }
                
                setLoading(false);
            } catch (error) {
                console.error('❌ Error fetching booking:', error);
                setLoading(false);
            }
        };

        fetchBooking();
    }, [orderId]);

    const getStatusText = (status) => {
        const statusMap = {
            'pending': 'Finding rider...',
            'assigned': 'Rider assigned',
            'picked_up': 'Package picked up',
            'in_transit': 'On the way',
            'delivered': 'Delivered'
        };
        return statusMap[status] || status;
    };

    useEffect(() => {
        // Initialize map only once
        if (!mapInstanceRef.current && document.getElementById("tracking-map-v2")) {
            // Create map with absolute minimal config
            const map = L.map("tracking-map-v2", {
                preferCanvas: true,
                renderer: L.canvas()
            }).setView([6.5244, 3.3792], 13);

            // Add OpenStreetMap tiles - guaranteed to work
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19,
                crossOrigin: true
            }).addTo(map);

            mapInstanceRef.current = map;

            // Wait for map to fully initialize before adding markers
            setTimeout(() => {
                // Add simple markers
                L.marker([6.5244, 3.3792]).addTo(map)
                    .bindPopup('Pickup Location');
                
                L.marker([6.5344, 3.3892]).addTo(map)
                    .bindPopup('Dropoff Location');
                    
                map.invalidateSize();
                
                // Force tiles to be visible with JavaScript
                setTimeout(() => {
                    const tiles = document.querySelectorAll('#tracking-map-v2 .leaflet-tile');
                    console.log('Found tiles:', tiles.length);
                    tiles.forEach((tile, index) => {
                        tile.style.opacity = '1';
                        tile.style.visibility = 'visible';
                        tile.style.display = 'block';
                        console.log(`Fixed tile ${index}:`, tile.src);
                    });
                    
                    // Also force tile pane
                    const tilePane = document.querySelector('#tracking-map-v2 .leaflet-tile-pane');
                    if (tilePane) {
                        tilePane.style.opacity = '1';
                        tilePane.style.visibility = 'visible';
                        tilePane.style.display = 'block';
                        console.log('Fixed tile pane');
                    }
                }, 1000);
            }, 100);
        }

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Separate useEffect for Firebase listener
    useEffect(() => {
        if (!orderId || !database) return;
        
        const locationRef = ref(database, `orders/${orderId}/riderLocation`);
        const unsubscribe = onValue(locationRef, (snapshot) => {
            const location = snapshot.val();
            if (location && location.lat && location.lng && riderMarkerRef.current) {
                riderMarkerRef.current.setLatLng([location.lat, location.lng]);
                setRiderPos({ lat: location.lat, lng: location.lng });
            }
        });

        return () => unsubscribe();
    }, [orderId, database]);

    const handleCallRider = () => {
        // Simulate calling the rider
        alert(`📞 Calling ${riderInfo.name}...`);
    };

    const getStatusColor = () => {
        switch (orderStatus) {
            case "picked_up": return "#f59e0b";
            case "in_transit": return "#3b82f6";
            case "delivered": return "#22c55e";
            default: return "#6b7280";
        }
    };

    return (
        <>
            <Helmet>
                <title>Live Tracking {orderId ? `- ${orderId}` : ''} - Go7 Delivery</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            </Helmet>

            {/* Loading State */}
            {loading && (
                <div style={{ 
                    position: "fixed", 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "white",
                    zIndex: 9999 
                }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px", animation: "pulse 1.5s infinite" }}>🏍️</div>
                    <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Loading your delivery...</h2>
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>Fetching order details</p>
                </div>
            )}

            {/* Order Not Found State */}
            {!loading && orderId && !bookingData && (
                <div style={{ 
                    position: "fixed", 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "white",
                    padding: "20px",
                    zIndex: 9999 
                }}>
                    <div style={{ fontSize: "64px", marginBottom: "20px" }}>📦</div>
                    <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>Order Not Found</h2>
                    <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "8px", textAlign: "center" }}>
                        We couldn't find order <strong>{orderId}</strong>
                    </p>
                    <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "24px" }}>
                        Please check your order ID and try again
                    </p>
                    <button
                        onClick={() => navigate('/book')}
                        style={{
                            backgroundColor: "#E30000",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            padding: "14px 28px",
                            fontSize: "16px",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(227, 0, 0, 0.3)"
                        }}
                    >
                        Book New Delivery
                    </button>
                </div>
            )}

            <div style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden" }}>
                {/* Mobile Header */}
                {isMobile && (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        background: "white",
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        zIndex: 1001,
                        borderBottom: "1px solid #e5e7eb"
                    }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "24px",
                                cursor: "pointer",
                                padding: "8px"
                            }}
                        >
                            ←
                        </button>
                        <h1 style={{
                            fontSize: "20px",
                            fontWeight: "bold",
                            color: "#111827",
                            margin: 0
                        }}>
                            Track Delivery
                        </h1>
                    </div>
                )}

                {/* Map Container */}
                <div id="tracking-map-v2" data-version="simplified-v2" style={{ height: isMobile ? "50vh" : "100%", width: "100%", marginTop: isMobile ? "60px" : 0 }}></div>

                {/* Mobile Header - Top pickup/dropoff labels */}
                {isMobile && bookingData && (
                    <>
                        <div style={{
                            position: "absolute",
                            top: "80px",
                            left: "20px",
                            background: "white",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span style={{ fontSize: "16px" }}>📍</span>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                                {bookingData.pickup?.address?.split(',')[0] || "Oke-Ilewo"}
                            </span>
                        </div>
                        <div style={{
                            position: "absolute",
                            bottom: isMobile ? "calc(60vh + 20px)" : "20px",
                            right: "20px",
                            background: "#111827",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span style={{ fontSize: "16px" }}>📍</span>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "white" }}>
                                {bookingData.dropoff?.address?.split(',')[0] || "Destination"}
                            </span>
                        </div>
                    </>
                )}

                {/* Desktop Only - Order ID Badge */}
                {!isMobile && orderId && (
                    <div
                        style={{
                            position: "absolute",
                            top: "20px",
                            left: "20px",
                            background: "rgba(0, 0, 0, 0.75)",
                            backdropFilter: "blur(10px)",
                            borderRadius: "12px",
                            padding: "8px 16px",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}
                    >
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                            Order
                        </span>
                        <span style={{ fontSize: "13px", color: "white", fontWeight: 700, letterSpacing: "0.5px" }}>
                            {orderId}
                        </span>
                    </div>
                )}

                {/* Desktop Only - Top Status Bar */}
                {!isMobile && (
                <div
                    style={{
                        position: "absolute",
                        top: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "white",
                        borderRadius: "24px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                        padding: "12px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        zIndex: 1000,
                        minWidth: "250px",
                        justifyContent: "center"
                    }}
                >
                    <div
                        style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: getStatusColor(),
                            animation: "pulse 2s infinite"
                        }}
                    />
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>
                        {getStatusText(orderStatus)}
                    </span>
                </div>
                )}

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        position: "absolute",
                        top: "20px",
                        left: "20px",
                        backgroundColor: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "48px",
                        height: "48px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        zIndex: 1000,
                        fontSize: "24px"
                    }}
                >
                    ←
                </button>

                {/* Mobile-Optimized Bottom Card */}
                {isMobile ? (
                    <div
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "white",
                            borderTopLeftRadius: "24px",
                            borderTopRightRadius: "24px",
                            boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
                            padding: "24px 20px",
                            zIndex: 1000,
                            maxHeight: "65vh",
                            overflowY: "auto"
                        }}
                    >
                        {/* Estimated Arrival Section */}
                        <div style={{ marginBottom: "24px" }}>
                            <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "4px", fontWeight: 500 }}>Estimated Arrival</p>
                            <h2 style={{ fontSize: "32px", fontWeight: "700", color: "#111827", margin: "0", letterSpacing: "-0.5px" }}>
                                {etaLoading ? "Calculating..." : dynamicETA}
                            </h2>
                            {distance && (
                                <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                                    📍 {distance} away
                                </p>
                            )}
                        </div>

                        {/* Pickup & Dropoff Addresses */}
                        <div style={{ 
                            background: "#f9fafb", 
                            borderRadius: "16px", 
                            padding: "16px",
                            marginBottom: "20px",
                            border: "1px solid #e5e7eb"
                        }}>
                            {/* Pickup */}
                            <div style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
                                <div style={{ 
                                    width: "12px", 
                                    height: "12px", 
                                    borderRadius: "50%", 
                                    background: "#22c55e",
                                    marginTop: "4px",
                                    flexShrink: 0,
                                    border: "2px solid #dcfce7"
                                }}></div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px", fontWeight: 500 }}>PICKUP</p>
                                    <p style={{ fontSize: "15px", color: "#111827", fontWeight: 500, margin: 0 }}>
                                        {bookingData?.pickup?.address || "Ikeja City Mall, Lagos"}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Dotted line */}
                            <div style={{ 
                                borderLeft: "2px dotted #d1d5db", 
                                height: "20px", 
                                marginLeft: "5px",
                                marginBottom: "8px"
                            }}></div>
                            
                            {/* Dropoff */}
                            <div style={{ display: "flex", gap: "12px" }}>
                                <div style={{ 
                                    width: "12px", 
                                    height: "12px", 
                                    borderRadius: "3px", 
                                    background: "#E30000",
                                    marginTop: "4px",
                                    flexShrink: 0
                                }}></div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px", fontWeight: 500 }}>DROPOFF</p>
                                    <p style={{ fontSize: "15px", color: "#111827", fontWeight: 500, margin: 0 }}>
                                        {bookingData?.dropoff?.address || "Victoria Island, Lagos"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Status & Package Info */}
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{
                                display: "inline-block",
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "8px 16px",
                                borderRadius: "20px",
                                fontSize: "13px",
                                fontWeight: 600,
                                marginBottom: "12px"
                            }}>
                                {getStatusText(bookingData?.status || orderStatus)}
                            </div>
                            {orderId && (
                                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                                    Package ID: <span style={{ fontWeight: 600, color: "#111827" }}>{orderId}</span>
                                </p>
                            )}
                        </div>

                        {/* Rider Info Card */}
                        {riderInfo.name !== "Assigning rider..." && (
                            <div 
                                style={{ 
                                    background: "#ffffff",
                                    borderRadius: "16px",
                                    padding: "16px",
                                    marginBottom: "16px",
                                    border: "1px solid #e5e7eb",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px"
                                }}
                            >
                                <div style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #E30000, #ff4444)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "28px",
                                    flexShrink: 0
                                }}>
                                    🏍️
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: "0 0 4px 0" }}>
                                        {riderInfo.name}
                                    </p>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "14px", color: "#6b7280" }}>⭐ {riderInfo.rating}</span>
                                        {riderInfo.phone && (
                                            <>
                                                <span style={{ color: "#d1d5db" }}>•</span>
                                                <span style={{ fontSize: "14px", color: "#6b7280" }}>{riderInfo.phone}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/go7-chat/${orderId || 'default'}`)}
                                    style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "50%",
                                        background: "#E30000",
                                        border: "none",
                                        color: "white",
                                        fontSize: "20px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 2px 8px rgba(227, 0, 0, 0.2)"
                                    }}
                                >
                                    💬
                                </button>
                            </div>
                        )}

                        {/* Order Details */}
                        {bookingData && (
                            <div style={{ 
                                background: "#f9fafb", 
                                borderRadius: "16px", 
                                padding: "16px",
                                border: "1px solid #e5e7eb"
                            }}>
                                <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "12px", fontWeight: 600 }}>ORDER DETAILS</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {bookingData.packageType && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: "14px", color: "#6b7280" }}>Package Type</span>
                                            <span style={{ fontSize: "14px", color: "#111827", fontWeight: 500 }}>{bookingData.packageType}</span>
                                        </div>
                                    )}
                                    {bookingData.deliveryPrice && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: "14px", color: "#6b7280" }}>Delivery Fee</span>
                                            <span style={{ fontSize: "14px", color: "#111827", fontWeight: 600 }}>₦{bookingData.deliveryPrice}</span>
                                        </div>
                                    )}
                                    {bookingData.createdAt && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: "14px", color: "#6b7280" }}>Ordered</span>
                                            <span style={{ fontSize: "14px", color: "#111827", fontWeight: 500 }}>
                                                {new Date(bookingData.createdAt.seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Message Input */}
                        <div 
                            onClick={() => navigate(`/go7-chat/${orderId || 'default'}`)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "14px 16px",
                                background: "#f3f4f6",
                                borderRadius: "24px",
                                cursor: "pointer",
                                border: "1px solid #e5e7eb"
                            }}
                        >
                            <span style={{ flex: 1, color: "#9ca3af", fontSize: "15px" }}>
                                Message Rider
                            </span>
                            <span style={{ fontSize: "20px" }}>🎤</span>
                        </div>
                    </div>
                ) : (
                    /* Desktop View - Full Details */
                    <>
                    {console.log("🖥️ Rendering DESKTOP UI")}
                    {/* Debug badge */}
                    <div style={{ 
                        position: "fixed", 
                        top: "70px", 
                        right: "10px", 
                        background: "#3b82f6", 
                        color: "white", 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        fontSize: "10px", 
                        zIndex: 9999,
                        fontWeight: "bold"
                    }}>
                        DESKTOP UI ✓
                    </div>
                    <div
                    style={{
                        position: "absolute",
                        bottom: "100px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "white",
                        borderRadius: "16px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        padding: "20px",
                        width: "90%",
                        maxWidth: "400px",
                        zIndex: 1000
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                        <div
                            style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #E30000, #ff4444)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "28px",
                                boxShadow: "0 2px 8px rgba(227, 0, 0, 0.2)"
                            }}
                        >
                            🏍️
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: "18px", color: "#111827" }}>
                                    {riderInfo.name}
                                </span>
                                <span style={{ fontSize: "14px" }}>⭐ {riderInfo.rating}</span>
                            </div>
                            
                            {/* 🚀 Dynamic ETA Display */}
                            <div style={{ marginBottom: "4px" }}>
                                <p className="eta-label" style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Estimated Arrival
                                </p>
                                <h2 className="eta-time" style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#E30000", margin: "0" }}>
                                    {etaLoading ? "Calculating..." : dynamicETA}
                                </h2>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                {distance && (
                                    <>
                                        <span className="distance" style={{ color: "#6b7280", fontSize: "14px", fontWeight: 500 }}>
                                            📍 {distance}
                                        </span>
                                        <span style={{ color: "#6b7280", fontSize: "14px" }}>•</span>
                                    </>
                                )}
                                <span style={{ color: "#6b7280", fontSize: "14px" }}>
                                    {riderInfo.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Order ID */}
                    {orderId && (
                        <div style={{
                            background: "#f3f4f6",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            marginTop: "12px"
                        }}>
                            <span style={{ fontSize: "12px", color: "#6b7280" }}>Order ID: </span>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{orderId}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                        <button
                            onClick={handleCallRider}
                            style={{
                                flex: 1,
                                backgroundColor: "#E30000",
                                color: "white",
                                border: "none",
                                borderRadius: "12px",
                                padding: "14px",
                                fontSize: "16px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                boxShadow: "0 2px 8px rgba(227, 0, 0, 0.3)",
                                transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#c50000"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#E30000"}
                        >
                            📞 Call Rider
                        </button>
                        <button
                            onClick={() => navigate(`/go7-chat/${orderId || 'default'}`)}
                            style={{
                                backgroundColor: "#f3f4f6",
                                color: "#111827",
                                border: "none",
                                borderRadius: "12px",
                                padding: "14px",
                                fontSize: "24px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "56px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e7eb"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                        >
                            💬
                        </button>
                    </div>

                    {/* 📦 Comprehensive Order Details */}
                    {bookingData && (
                        <div style={{ marginTop: "24px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
                            {/* Package Information */}
                            <div style={{ marginBottom: "20px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    📦 Package Details
                                </h3>
                                <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
                                    {bookingData.packageName && (
                                        <div style={{ marginBottom: "10px" }}>
                                            <span style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Item</span>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{bookingData.packageName}</span>
                                        </div>
                                    )}
                                    {bookingData.packageSize && (
                                        <div style={{ marginBottom: "10px" }}>
                                            <span style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Size</span>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{bookingData.packageSize}</span>
                                        </div>
                                    )}
                                    {bookingData.packageWeight && (
                                        <div>
                                            <span style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Weight</span>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{bookingData.packageWeight}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pickup Information */}
                            <div style={{ marginBottom: "20px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    📍 Pickup Location
                                </h3>
                                <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px", borderLeft: "4px solid #22c55e" }}>
                                    {bookingData.sender && (
                                        <>
                                            <div style={{ marginBottom: "10px" }}>
                                                <span style={{ fontSize: "12px", color: "#166534", display: "block", marginBottom: "4px" }}>Sender</span>
                                                <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>{bookingData.sender.name}</span>
                                            </div>
                                            {bookingData.sender.phone && (
                                                <div style={{ marginBottom: "10px" }}>
                                                    <span style={{ fontSize: "12px", color: "#166534", display: "block", marginBottom: "4px" }}>Phone</span>
                                                    <a href={`tel:${bookingData.sender.phone}`} style={{ fontSize: "14px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                                                        📞 {bookingData.sender.phone}
                                                    </a>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {bookingData.pickup && bookingData.pickup.address && (
                                        <div>
                                            <span style={{ fontSize: "12px", color: "#166534", display: "block", marginBottom: "4px" }}>Address</span>
                                            <span style={{ fontSize: "14px", color: "#374151", lineHeight: "1.5" }}>{bookingData.pickup.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dropoff Information */}
                            <div style={{ marginBottom: "20px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    🎯 Delivery Location
                                </h3>
                                <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "16px", borderLeft: "4px solid #E30000" }}>
                                    {bookingData.recipient && (
                                        <>
                                            <div style={{ marginBottom: "10px" }}>
                                                <span style={{ fontSize: "12px", color: "#991b1b", display: "block", marginBottom: "4px" }}>Recipient</span>
                                                <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>{bookingData.recipient.name}</span>
                                            </div>
                                            {bookingData.recipient.phone && (
                                                <div style={{ marginBottom: "10px" }}>
                                                    <span style={{ fontSize: "12px", color: "#991b1b", display: "block", marginBottom: "4px" }}>Phone</span>
                                                    <a href={`tel:${bookingData.recipient.phone}`} style={{ fontSize: "14px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                                                        📞 {bookingData.recipient.phone}
                                                    </a>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {bookingData.dropoff && bookingData.dropoff.address && (
                                        <div>
                                            <span style={{ fontSize: "12px", color: "#991b1b", display: "block", marginBottom: "4px" }}>Address</span>
                                            <span style={{ fontSize: "14px", color: "#374151", lineHeight: "1.5" }}>{bookingData.dropoff.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment & Status */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                {bookingData.fare && (
                                    <div style={{ background: "#fffbeb", borderRadius: "12px", padding: "16px", border: "1px solid #fcd34d" }}>
                                        <span style={{ fontSize: "12px", color: "#92400e", display: "block", marginBottom: "4px" }}>Total Fare</span>
                                        <span style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>₦{bookingData.fare.toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "16px", border: "1px solid #93c5fd" }}>
                                    <span style={{ fontSize: "12px", color: "#1e40af", display: "block", marginBottom: "4px" }}>Status</span>
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{getStatusText(bookingData.status)}</span>
                                </div>
                            </div>

                            {/* Booking Time */}
                            {bookingData.createdAt && (
                                <div style={{ marginTop: "16px", textAlign: "center", padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                        Booked on {new Date(bookingData.createdAt.toDate ? bookingData.createdAt.toDate() : bookingData.createdAt).toLocaleString('en-NG', { 
                                            dateStyle: 'medium', 
                                            timeStyle: 'short' 
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                    </>
                )}

                {/* Floating Chat Button - Alternative Position (Desktop Only) */}
                {!isMobile && (
                <button
                    onClick={() => navigate(`/go7-chat/${orderId || 'default'}`)}
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        right: "20px",
                        backgroundColor: "#E30000",
                        border: "none",
                        borderRadius: "50%",
                        width: "64px",
                        height: "64px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(227, 0, 0, 0.4)",
                        cursor: "pointer",
                        fontSize: "28px",
                        zIndex: 999,
                        transition: "all 0.3s"
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = "scale(1.1)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(227, 0, 0, 0.5)";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(227, 0, 0, 0.4)";
                    }}
                >
                    💬
                </button>
                )}
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        .custom-rider-icon {
          background: transparent !important;
          border: none !important;
        }

        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .leaflet-popup-content {
          margin: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
        </>
    );
}
