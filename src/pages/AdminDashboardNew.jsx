import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, serverTimestamp, getDocs, getDoc, orderBy, addDoc, limit } from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import riderLocationSync from '../services/RiderLocationSync';
import WhatsAppNotificationsPage from './admin/WhatsAppNotificationsPage';
import PricingSettingsPanel from './admin/PricingSettingsPanel';
import BillsPricingPanel from './admin/BillsPricingPanel';
import DeliveryZonesPanel from './admin/DeliveryZonesPanel';
import PromoBannerPanel from './admin/PromoBannerPanel';
import AdminEarningsPanel from '../components/AdminEarningsPanel';
import GrowthPanel from '../components/GrowthPanel';
import PaymentAnomalies from '../components/PaymentAnomalies';
import PlatformRevenuePanel from '../components/PlatformRevenuePanel';
import { mapVendorDiscoveryFields } from '../utils/vendorVisibility';
import { FLEET_OPTIONS, formatFleetLabel, fleetSelectValue, normalizeFleetType } from '../utils/riderFleetLabels';
import { RIDER_APPROVAL_FIELDS } from '../utils/riderApproval';
import {
  ADMIN_DISPATCH_FLOW,
  getAdminStatusLabel,
  getAdminStatusColor,
  isActiveDeliveryStatus,
  isIncomingDeliveryStatus,
  ADMIN_NEXT_STATUS,
} from '../utils/deliveryAdminStatus';

// URL path → tab id mapping for deep-linking
const PATH_TO_TAB = {
    '/admin':               'dispatch',
    '/admin/dashboard':     'dispatch',
    '/admin/vendors':       'vendors',
    '/admin/payments':      'payments',
    '/admin/orders':        'orders',
    '/admin/riders':        'riders',
    '/admin/agent-earnings':'agents',
    '/admin/categories':    'categories',
    '/admin/analytics':     'analytics',
    '/admin/customers':     'customers',
    '/admin/bookings':      'bookings',
    '/admin/gobuy':         'gobuy',
    '/admin/whatsapp':      'notifications',
    '/admin/fcm-broadcast': 'fcm',
    '/admin/pricing':       'pricing',
    '/admin/promos':        'promos',
    '/admin/growth':        'growth',
};

const TAB_TO_PATH = {
    dispatch: '/admin',
    overview: '/admin',
    analytics: '/admin/analytics',
    orders: '/admin/orders',
    bookings: '/admin/bookings',
    gobuy: '/admin/gobuy',
    customers: '/admin/customers',
    riders: '/admin/riders',
    vendors: '/admin/vendors',
    payments: '/admin/payments',
    pricing: '/admin/pricing',
    promos: '/admin/promos',
    growth: '/admin/growth',
    agents: '/admin/agent-earnings',
    support: '/admin',
    notifications: '/admin/whatsapp',
    fcm: '/admin/fcm-broadcast',
    map: '/admin',
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const riderMarkersRef = useRef({});

    // Tab state
    const [activeTab, setActiveTab] = useState('dispatch');
    
    // Data state
    const [orders, setOrders] = useState([]);
    const [riders, setRiders] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [payments, setPayments] = useState([]);
    const [payoutRequests, setPayoutRequests] = useState([]);
    const [payoutBackfillRunning, setPayoutBackfillRunning] = useState(false);
    const [supportTickets, setSupportTickets] = useState([]);
    const [agentCount, setAgentCount] = useState(0);
    const [agentsList, setAgentsList] = useState([]);
    const [orderFilter, setOrderFilter] = useState('all');
    const [customers, setCustomers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [adminAlerts, setAdminAlerts] = useState([]);
    const [gobuyOrders, setGobuyOrders] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [bookingSearch, setBookingSearch] = useState('');
    const [riderSearch, setRiderSearch] = useState('');
    
    // Stats state
    const [stats, setStats] = useState({
        activeOrders: 0,
        onlineRiders: 0,
        totalEarnings: 0,
        pendingPayments: 0,
        pendingPayouts: 0
    });
    
    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedRider, setSelectedRider] = useState(null);
    const [riderFleetEdit, setRiderFleetEdit] = useState('bike');
    const [mapInitialized, setMapInitialized] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [vendorEditForm, setVendorEditForm] = useState({ name: '', businessName: '', category: '', address: '' });

    // Dispatch modals
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [bookingForm, setBookingForm] = useState({ customerName: '', customerPhone: '', pickupAddress: '', dropoffAddress: '', packageDescription: '', estimatedPrice: '', riderId: '' });
    const [supportForm, setSupportForm] = useState({ subject: '', description: '', type: 'complaint', priority: 'medium', customerName: '', customerPhone: '' });
    const [dispatchSaving, setDispatchSaving] = useState(false);
    const seenAlertIdsRef = useRef(new Set());

    const isPaidBooking = (b) => {
        const ps = String(b?.paymentStatus || b?.payment?.status || '').toLowerCase();
        return ps === 'paid' || ps === 'completed' || ps === 'success';
    };

    const getBookingAgeMinutes = (b) => {
        const raw = b?.createdAt?.toDate?.() || b?.timestamp?.toDate?.() || (b?.createdAt ? new Date(b.createdAt) : null);
        if (!raw || Number.isNaN(raw.getTime())) return 0;
        return Math.floor((Date.now() - raw.getTime()) / 60000);
    };

    // Switch tab based on URL path
    useEffect(() => {
        const tab = PATH_TO_TAB[location.pathname];
        if (tab) setActiveTab(tab);
    }, [location.pathname]);

    // Initialize dashboard
    useEffect(() => {
        initializeDashboard();
        initializeMap();
        const unsubscribeAll = setupRealtimeListeners();
        
        return () => {
            riderLocationSync.stopTrackingAllRiders();
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }
            if (unsubscribeAll) unsubscribeAll();
        };
    }, []);

    const initializeDashboard = async () => {
        try {
            setIsLoading(true);
            console.log('🚀 Initializing Go7 Admin Dashboard...');
            
            // Initialize rider sync service
            riderLocationSync.initialize({ updateFrequency: 10000 });
            
            setIsLoading(false);
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            setIsLoading(false);
        }
    };

    const initializeMap = () => {
        if (!mapRef.current || mapInstanceRef.current) return;

        try {
            // Create map centered on Abeokuta
            mapInstanceRef.current = L.map(mapRef.current).setView([7.160427, 3.347663], 12);

            // Add tile layer
            L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL', {
                attribution: '© MapTiler © Go7',
                maxZoom: 18,
            }).addTo(mapInstanceRef.current);

            // Custom rider icon
            const riderIcon = L.divIcon({
                html: `<div style="background: #ef4444; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🛵</div>`,
                iconSize: [20, 20],
                className: 'rider-marker'
            });

            setMapInitialized(true);
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    };

    const setupRealtimeListeners = () => {
        // Listen to orders
        const ordersQuery = query(collection(db, 'orders'));
        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
            const ordersData = [];
            snapshot.forEach((doc) => {
                ordersData.push({ id: doc.id, ...doc.data() });
            });
            setOrders(ordersData);
            updateStats({ orders: ordersData });
        });

        // Listen to ALL riders (not just "active" — pending/offline riders must show for admin)
        const unsubscribeRiders = onSnapshot(collection(db, 'riders'), (snapshot) => {
            const ridersData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setRiders(ridersData);
            updateRiderMarkers(ridersData.filter((r) => r.currentLocation));
            updateStats({ riders: ridersData });
        }, (error) => {
            console.error('Error loading riders:', error);
            toast.error('Could not load riders from Firebase');
        });

        // Listen to vendors
        const vendorsQuery = query(collection(db, 'vendors'));
        const unsubscribeVendors = onSnapshot(vendorsQuery, (snapshot) => {
            const vendorsData = [];
            snapshot.forEach((doc) => {
                vendorsData.push({ id: doc.id, ...doc.data() });
            });
            setVendors(vendorsData);
        });

        // Listen to payments
        const paymentsQuery = query(collection(db, 'payments'));
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            const paymentsData = [];
            snapshot.forEach((doc) => {
                paymentsData.push({ id: doc.id, ...doc.data() });
            });
            setPayments(paymentsData);
            updateStats({ payments: paymentsData });
        });

        // Listen to payout requests
        const payoutRequestsQuery = query(collection(db, 'payoutRequests'), orderBy('createdAt', 'desc'));
        const unsubscribePayoutRequests = onSnapshot(payoutRequestsQuery, (snapshot) => {
            const payoutRequestsData = [];
            snapshot.forEach((doc) => {
                payoutRequestsData.push({ id: doc.id, ...doc.data() });
            });
            setPayoutRequests(payoutRequestsData);
            updateStats({ payoutRequests: payoutRequestsData });
        });

        // Listen to support tickets
        const supportTicketsQuery = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
        const unsubscribeSupportTickets = onSnapshot(supportTicketsQuery, (snapshot) => {
            const supportTicketsData = [];
            snapshot.forEach((doc) => {
                supportTicketsData.push({ id: doc.id, ...doc.data() });
            });
            setSupportTickets(supportTicketsData);
        });

        // Listen to agents
        const agentsQuery = query(collection(db, 'agents'));
        const unsubscribeAgents = onSnapshot(agentsQuery, (snapshot) => {
            const data = [];
            snapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));
            setAgentsList(data);
            setAgentCount(data.length);
        });

        // Helper: try ordered query, fall back to unordered; returns unsubscribe
        const snapWithFallback = (orderedQ, fallbackQ, setter) => {
            let unsub;
            unsub = onSnapshot(orderedQ, (snap) => {
                setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, () => {
                if (unsub) { unsub(); }
                unsub = onSnapshot(fallbackQ, (snap) => {
                    setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });
            });
            return () => unsub && unsub();
        };

        const unsubscribeCustomers = snapWithFallback(
            query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200)),
            query(collection(db, 'users'), limit(200)),
            setCustomers
        );

        const unsubscribeBookings = snapWithFallback(
            query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100)),
            query(collection(db, 'bookings'), limit(100)),
            (data) => {
                const sorted = [...data].sort((a, b) => {
                    const ta = a.createdAt?.toMillis?.() || a.timestamp?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
                    const tb = b.createdAt?.toMillis?.() || b.timestamp?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
                    return tb - ta;
                });
                setBookings(sorted);
            }
        );

        const unsubscribeGobuy = snapWithFallback(
            query(collection(db, 'gobuy_orders'), orderBy('createdAt', 'desc'), limit(100)),
            query(collection(db, 'gobuy_orders'), limit(100)),
            setGobuyOrders
        );

        const unsubscribeAdminAlerts = snapWithFallback(
            query(collection(db, 'adminAlerts'), orderBy('createdAt', 'desc'), limit(50)),
            query(collection(db, 'adminAlerts'), limit(50)),
            setAdminAlerts
        );

        return () => {
            unsubscribeOrders();
            if (typeof unsubscribeRiders === 'function') unsubscribeRiders();
            unsubscribeVendors();
            unsubscribePayments();
            unsubscribePayoutRequests();
            unsubscribeSupportTickets();
            unsubscribeAgents();
            unsubscribeCustomers();
            unsubscribeBookings();
            unsubscribeGobuy();
            unsubscribeAdminAlerts();
        };
    };

    // Toast + browser notification for new urgent admin alerts
    useEffect(() => {
        if (!adminAlerts.length) return;
        adminAlerts.forEach((alert) => {
            if (seenAlertIdsRef.current.has(alert.id)) return;
            seenAlertIdsRef.current.add(alert.id);
            if (alert.read) return;
            if (!['high', 'critical'].includes(alert.severity)) return;

            toast.error(alert.title || 'Urgent booking alert', {
                duration: 12000,
                id: alert.id,
            });

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(alert.title || 'Go7 Admin Alert', {
                    body: alert.message || alert.bookingId,
                    tag: alert.id,
                });
            }
        });
    }, [adminAlerts]);

    useEffect(() => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
        Notification.requestPermission().catch(() => {});
    }, []);

    const updateStats = ({ orders: ordersData, riders: ridersData, payments: paymentsData, payoutRequests: payoutRequestsData }) => {
        setStats(prev => ({
            activeOrders: ordersData ? ordersData.filter(o => ['pending', 'assigned', 'in_progress'].includes(o.status)).length : prev.activeOrders,
            onlineRiders: ridersData ? ridersData.filter(r => r.status === 'active' || r.status === 'delivering').length : prev.onlineRiders,
            totalEarnings: ordersData ? ordersData.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0) : prev.totalEarnings,
            pendingPayments: paymentsData ? paymentsData.filter(p => p.status === 'pending').length : prev.pendingPayments,
            pendingPayouts: payoutRequestsData ? payoutRequestsData.filter(p => p.status === 'pending').length : prev.pendingPayouts
        }));
    };

    const updateRiderMarkers = (ridersData) => {
        if (!mapInstanceRef.current) return;

        // Clear existing markers
        Object.values(riderMarkersRef.current).forEach(marker => {
            mapInstanceRef.current.removeLayer(marker);
        });
        riderMarkersRef.current = {};

        // Add new markers
        ridersData.forEach(rider => {
            if (rider.currentLocation) {
                const statusColor = {
                    'active': '#10b981',
                    'delivering': '#f59e0b',
                    'offline': '#6b7280',
                    'on_break': '#8b5cf6'
                };

                const marker = L.marker([rider.currentLocation.latitude, rider.currentLocation.longitude], {
                    icon: L.divIcon({
                        html: `<div style="background: ${statusColor[rider.status] || '#6b7280'}; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🛵</div>`,
                        iconSize: [24, 24],
                        className: 'rider-marker'
                    })
                }).addTo(mapInstanceRef.current);

                marker.bindPopup(`
                    <div class="p-2">
                        <h3 class="font-bold">${rider.name || 'Rider'}</h3>
                        <p class="text-sm">Status: ${rider.status}</p>
                        ${rider.currentOrderId ? `<p class="text-sm">Order: #${rider.currentOrderId.slice(-8)}</p>` : ''}
                    </div>
                `);

                riderMarkersRef.current[rider.id] = marker;
            }
        });
    };

    const assignRiderToOrder = async (orderId, riderId) => {
        try {
            await riderLocationSync.assignOrderToRider(orderId, riderId);
            
            Swal.fire({
                title: 'Rider Assigned!',
                text: 'The order has been successfully assigned to the rider.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error assigning rider:', error);
            Swal.fire({
                title: 'Assignment Failed',
                text: 'Failed to assign rider to order. Please try again.',
                icon: 'error'
            });
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const payload = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'orders', orderId), payload, { merge: true });
            await setDoc(doc(db, 'bookings', orderId), payload, { merge: true });

            if (newStatus === 'delivered') {
                Swal.fire({
                    title: 'Package Delivered!',
                    text: 'Order has been marked as delivered.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const acceptOrder = async (orderId) => {
        try {
            const payload = { status: 'accepted', acceptedAt: serverTimestamp(), acceptedBy: getAuth().currentUser?.uid };
            await setDoc(doc(db, 'orders', orderId), payload, { merge: true });
            await setDoc(doc(db, 'bookings', orderId), payload, { merge: true });
            toast.success('Order accepted');
        } catch (e) { toast.error('Failed to accept order'); }
    };

    const cancelOrder = async (orderId) => {
        const { value: reason } = await Swal.fire({ title: 'Cancel Order', input: 'text', inputLabel: 'Reason for cancellation', inputPlaceholder: 'Enter reason…', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Cancel Order' });
        if (reason === undefined) return;
        try {
            const payload = { status: 'cancelled', cancelledAt: serverTimestamp(), cancelReason: reason || 'Cancelled by admin', cancelledBy: getAuth().currentUser?.uid };
            await setDoc(doc(db, 'orders', orderId), payload, { merge: true });
            await setDoc(doc(db, 'bookings', orderId), payload, { merge: true });
            toast.success('Order cancelled');
        } catch (e) { toast.error('Failed to cancel order'); }
    };

    const createManualBooking = async () => {
        if (!bookingForm.customerName || !bookingForm.pickupAddress || !bookingForm.dropoffAddress) {
            toast.error('Fill in customer name, pickup and dropoff address'); return;
        }
        setDispatchSaving(true);
        try {
            const payload = {
                customerName: bookingForm.customerName.trim(),
                customerPhone: bookingForm.customerPhone.trim(),
                pickupAddress: bookingForm.pickupAddress.trim(),
                dropoffAddress: bookingForm.dropoffAddress.trim(),
                packageDescription: bookingForm.packageDescription.trim() || 'Not specified',
                estimatedPrice: parseFloat(bookingForm.estimatedPrice) || 0,
                status: bookingForm.riderId ? 'ASSIGNED' : 'PLACED',
                ...(bookingForm.riderId && { riderId: bookingForm.riderId }),
                source: 'admin_manual',
                createdBy: getAuth().currentUser?.uid,
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'bookings'), payload);
            toast.success('Manual booking created');
            setShowBookingModal(false);
            setBookingForm({ customerName: '', customerPhone: '', pickupAddress: '', dropoffAddress: '', packageDescription: '', estimatedPrice: '', riderId: '' });
        } catch (e) { console.error(e); toast.error('Failed to create booking'); }
        setDispatchSaving(false);
    };

    const logSupportIssue = async () => {
        if (!supportForm.subject || !supportForm.description) { toast.error('Subject and description required'); return; }
        setDispatchSaving(true);
        try {
            await addDoc(collection(db, 'supportTickets'), {
                subject: supportForm.subject.trim(),
                description: supportForm.description.trim(),
                type: supportForm.type,
                priority: supportForm.priority,
                customerName: supportForm.customerName.trim() || 'Walk-in',
                customerPhone: supportForm.customerPhone.trim() || '',
                status: 'open',
                source: 'admin_manual',
                createdBy: getAuth().currentUser?.uid,
                createdAt: serverTimestamp(),
            });
            toast.success('Support issue logged');
            setShowSupportModal(false);
            setSupportForm({ subject: '', description: '', type: 'complaint', priority: 'medium', customerName: '', customerPhone: '' });
        } catch (e) { toast.error('Failed to log issue'); }
        setDispatchSaving(false);
    };

    const openLiveMap = (order) => {
        if (order.riderId && mapInstanceRef.current) {
            const rider = riders.find(r => r.id === order.riderId);
            if (rider && rider.currentLocation) {
                mapInstanceRef.current.setView([rider.currentLocation.latitude, rider.currentLocation.longitude], 15);
                setActiveTab('map');
            }
        }
    };

    const approvePayout = async (payoutRequest) => {
        try {
            const vendorLabel = payoutRequest.vendorName || vendors.find(v => v.id === payoutRequest.vendorId)?.businessName || payoutRequest.vendorId;
            const result = await Swal.fire({
                title: 'Send Paystack Transfer',
                html: `
                  <p>Send <strong>₦${payoutRequest.amount?.toLocaleString()}</strong> to <strong>${vendorLabel}</strong>?</p>
                  <p class="text-sm text-gray-500 mt-2">This triggers a Paystack transfer from your Go7 balance.</p>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Send Transfer',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#10b981'
            });

            if (!result.isConfirmed) return;

            Swal.fire({ title: 'Processing…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const fn = httpsCallable(getFunctions(), 'processVendorPayout');
            const response = await fn({ payoutId: payoutRequest.id });

            Swal.fire({
                title: 'Transfer Initiated',
                html: `
                  <p>Paystack status: <strong>${response.data?.status || 'processing'}</strong></p>
                  ${response.data?.reference ? `<p class="text-sm">Ref: ${response.data.reference}</p>` : ''}
                `,
                icon: 'success',
                timer: 4000,
            });

        } catch (error) {
            console.error('Error approving payout:', error);
            Swal.fire({
                title: 'Transfer Failed',
                text: error.message || 'Paystack transfer could not be completed. Balance was returned to vendor.',
                icon: 'error'
            });
        }
    };

    const markPayoutPaidManually = async (payoutRequest) => {
        try {
            const { value: transferReference } = await Swal.fire({
                title: 'Mark as Paid',
                text: 'Use this if you already sent the money via bank/Paystack dashboard.',
                input: 'text',
                inputLabel: 'Transfer reference (optional)',
                inputPlaceholder: 'TRF_xxx or bank ref',
                showCancelButton: true,
                confirmButtonText: 'Mark Paid',
                confirmButtonColor: '#10b981',
            });

            if (transferReference === undefined) return;

            const fn = httpsCallable(getFunctions(), 'markVendorPayoutPaid');
            await fn({
                payoutId: payoutRequest.id,
                transferReference: transferReference || payoutRequest.reference,
            });

            Swal.fire({ title: 'Marked Paid', icon: 'success', timer: 2500, showConfirmButton: false });
        } catch (error) {
            Swal.fire({ title: 'Error', text: error.message || 'Could not mark payout as paid', icon: 'error' });
        }
    };

    const runVendorWalletBackfill = async (dryRun = false) => {
        try {
            setPayoutBackfillRunning(true);
            const fn = httpsCallable(getFunctions(), 'backfillVendorWallets');
            const result = await fn({ dryRun });
            const data = result.data || {};

            Swal.fire({
                title: dryRun ? 'Backfill Preview' : 'Backfill Complete',
                html: `
                  <ul style="text-align:left;font-size:14px;line-height:1.6">
                    <li>Vendors initialized: <strong>${data.vendorsInitialized ?? 0}</strong></li>
                    <li>Orders credited: <strong>${data.ordersCredited ?? 0}</strong></li>
                    <li>Orders skipped: <strong>${data.ordersSkipped ?? 0}</strong></li>
                    ${data.errorCount ? `<li>Errors: <strong>${data.errorCount}</strong></li>` : ''}
                  </ul>
                `,
                icon: data.errorCount ? 'warning' : 'success',
            });
        } catch (error) {
            Swal.fire({ title: 'Backfill Failed', text: error.message || 'Could not run backfill', icon: 'error' });
        } finally {
            setPayoutBackfillRunning(false);
        }
    };

    const rejectPayout = async (payoutRequest) => {
        try {
            const { value: reason } = await Swal.fire({
                title: 'Reject Payout',
                text: `Reject payout of ₦${payoutRequest.amount?.toLocaleString()} to ${payoutRequest.vendorName}?`,
                input: 'textarea',
                inputLabel: 'Reason for rejection (optional)',
                inputPlaceholder: 'Enter reason for rejecting this payout...',
                showCancelButton: true,
                confirmButtonText: 'Yes, Reject',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#ef4444'
            });

            if (reason === undefined) return; // User cancelled

            // Update payout request status
            await updateDoc(doc(db, 'payoutRequests', payoutRequest.id), {
                status: 'rejected',
                processedAt: serverTimestamp(),
                processedBy: 'Admin',
                adminNotes: reason || 'Rejected by admin'
            });

            // Return amount to vendor's available balance
            const vendorRef = doc(db, 'vendors', payoutRequest.vendorId);
            const vendorDoc = await getDoc(vendorRef);
            
            if (vendorDoc.exists()) {
                const vendorData = vendorDoc.data();
                await updateDoc(vendorRef, {
                    availableBalance: (vendorData.availableBalance || 0) + payoutRequest.amount,
                    pendingPayout: Math.max(0, (vendorData.pendingPayout || vendorData.pendingPayouts || 0) - payoutRequest.amount),
                    lastPayoutRejected: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }

            Swal.fire({
                title: 'Payout Rejected',
                text: 'The payout has been rejected and amount returned to vendor balance.',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error rejecting payout:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to reject payout. Please try again.',
                icon: 'error'
            });
        };
    };

    const updateVendorDetails = async () => {
        try {
            if (!editingVendor) return;

            const result = await Swal.fire({
                title: 'Update Vendor Details',
                text: `Save changes for ${vendorEditForm.businessName || vendorEditForm.name}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Save',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#10b981'
            });

            if (!result.isConfirmed) return;

            // Update vendor in Firestore
            await updateDoc(doc(db, 'vendors', editingVendor.id), {
                name: vendorEditForm.name,
                businessName: vendorEditForm.businessName,
                category: vendorEditForm.category,
                address: vendorEditForm.address,
                updatedAt: serverTimestamp(),
                lastModifiedBy: 'Admin'
            });

            // Close modal
            setEditingVendor(null);
            setVendorEditForm({ name: '', businessName: '', category: '', address: '' });

            Swal.fire({
                title: 'Vendor Updated!',
                text: 'Vendor details have been successfully updated.',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error updating vendor:', error);
            Swal.fire({
                title: 'Update Failed',
                text: 'Failed to update vendor details. Please try again.',
                icon: 'error'
            });
        }
    };

    const openVendorEditModal = (vendor) => {
        setEditingVendor(vendor);
        setVendorEditForm({
            name: vendor.name || '',
            businessName: vendor.businessName || vendor.name || '',
            category: vendor.category || '',
            address: vendor.address || ''
        });
    };

    const getAvailableRiders = () => {
        return riders.filter((rider) => {
            const available = ['available', 'online', 'active'].includes(rider.status);
            const notBusy = !rider.currentOrderId && !rider.currentOrder && rider.status !== 'busy' && rider.status !== 'delivering';
            return available && notBusy;
        });
    };

    // ─── RIDER ACTIONS ────────────────────────────────────────────────────────
    const approveRider = async (riderId, riderName) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Approve Rider?',
            html: `Allow <strong>${riderName || 'this rider'}</strong> to start accepting deliveries?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            confirmButtonColor: '#10b981',
        });
        if (!isConfirmed) return;
        try {
            const riderRef = doc(db, 'riders', riderId);
            const userRef = doc(db, 'users', riderId);
            const existing = await getDoc(riderRef);
            const payload = {
                ...RIDER_APPROVAL_FIELDS,
                go7OwnedVehicle: true,
                usesGo7Bike: true,
                approvedAt: serverTimestamp(),
                approvedBy: getAuth().currentUser?.uid,
                updatedAt: serverTimestamp(),
            };
            if (existing.exists()) {
                await updateDoc(riderRef, payload);
            } else {
                const userSnap = await getDoc(userRef);
                const u = userSnap.exists() ? userSnap.data() : {};
                await setDoc(riderRef, {
                    uid: riderId,
                    name: riderName || u.displayName || u.name || 'Rider',
                    phone: u.phone || '',
                    email: u.email || '',
                    ...payload,
                    createdAt: u.createdAt || serverTimestamp(),
                }, { merge: true });
            }

            await setDoc(
                userRef,
                {
                    role: 'rider',
                    riderApproved: true,
                    applicationStatus: 'approved',
                    verificationStatus: 'approved',
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            );

            setRiders((prev) =>
                prev.map((r) => (r.id === riderId ? { ...r, ...payload, id: riderId } : r)),
            );
            toast.success(`${riderName || 'Rider'} approved!`);
            setSelectedRider(null);
        } catch (err) { console.error(err); toast.error('Failed to approve rider'); }
    };

    const saveRiderFleetType = async (riderId) => {
        try {
            const fleet = normalizeFleetType(riderFleetEdit);
            await updateDoc(doc(db, 'riders', riderId), {
                ...fleet,
                updatedAt: serverTimestamp(),
            });
            setSelectedRider((prev) => (prev ? { ...prev, ...fleet } : prev));
            setRiders((prev) => prev.map((r) => (r.id === riderId ? { ...r, ...fleet } : r)));
            toast.success(`Vehicle type updated to ${formatFleetLabel(fleet)}`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to update vehicle type');
        }
    };

    const rejectRider = async (riderId, riderName) => {
        const { isConfirmed, value: reason } = await Swal.fire({
            title: `Reject ${riderName || 'rider'}?`,
            input: 'text',
            inputLabel: 'Reason (optional)',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Reject Application',
        });
        if (!isConfirmed) return;
        try {
            await updateDoc(doc(db, 'riders', riderId), {
                approved: false,
                status: 'rejected',
                verificationStatus: 'rejected',
                applicationStatus: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectionReason: reason || 'Rejected by admin',
                updatedAt: serverTimestamp(),
            });
            toast.success('Rider application rejected');
            setSelectedRider(null);
        } catch (err) { toast.error('Failed to reject rider'); }
    };

    const suspendRider = async (riderId, riderName) => {
        const { isConfirmed, value: reason } = await Swal.fire({
            title: `Suspend ${riderName}?`, input: 'text',
            inputLabel: 'Reason (optional)', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: 'Suspend'
        });
        if (!isConfirmed) return;
        try {
            await updateDoc(doc(db, 'riders', riderId), {
                status: 'suspended', suspendedAt: serverTimestamp(),
                suspensionReason: reason || 'Suspended by admin'
            });
            toast.success('Rider suspended');
        } catch (err) { toast.error('Failed to suspend rider'); }
    };

    const enableRiderReuploadAccount = async (riderId, profile) => {
        const existingSnap = await getDoc(doc(db, 'riders', riderId));
        const existing = existingSnap.exists() ? existingSnap.data() : {};
        const alreadyApproved =
            existing.approved === true ||
            existing.verificationStatus === 'approved' ||
            existing.status === 'active';

        const riderPatch = {
            uid: riderId,
            name: profile.name,
            fullName: profile.name,
            email: profile.email,
            phone: profile.phone,
            reuploadEnabled: true,
            reuploadRequestedAt: serverTimestamp(),
            reuploadRequestedBy: getAuth().currentUser?.uid || 'admin',
            updatedAt: serverTimestamp(),
        };

        // Never undo an approval when requesting document re-upload
        if (!alreadyApproved) {
            riderPatch.status = 'pending';
            riderPatch.approved = false;
            riderPatch.applicationStatus = 'under_review';
            riderPatch.verificationStatus = 'pending';
        }

        await setDoc(doc(db, 'riders', riderId), riderPatch, { merge: true });
        await setDoc(doc(db, 'users', riderId), {
            uid: riderId,
            role: 'rider',
            displayName: profile.name,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            reuploadEnabled: true,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

    const testGo7Email = async () => {
        try {
            const fn = httpsCallable(getFunctions(), 'diagnoseGo7Email');
            const { data } = await fn({ to: 'feyisetantobiloba@gmail.com' });
            if (data?.success) {
                toast.success(`Test email sent to ${data.to} (via ${data.from})`);
            } else {
                toast.error(data?.error || 'Email test failed');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Email test failed');
        }
    };

    const requestRiderReupload = async (rider) => {
        const name = rider.name || rider.fullName || 'Rider';
        let email = rider.email || '';
        const { isConfirmed, value: customEmail } = await Swal.fire({
            title: 'Send re-upload email?',
            html: `Enable re-upload and email <strong>${name}</strong> to log in and re-submit documents?`,
            input: 'email',
            inputValue: email,
            inputPlaceholder: 'rider@email.com',
            showCancelButton: true,
            confirmButtonText: 'Enable & Send Email',
            confirmButtonColor: '#E0001B',
        });
        if (!isConfirmed) return;
        const toEmail = (customEmail || email || '').trim();
        if (!toEmail || !toEmail.includes('@')) {
            toast.error('A valid email address is required');
            return;
        }
        try {
            await enableRiderReuploadAccount(rider.id, {
                name,
                email: toEmail,
                phone: rider.phone || '',
            });
            const fn = httpsCallable(getFunctions(), 'sendRiderReuploadEmail');
            await fn({
                riderId: rider.id,
                email: toEmail,
                name,
                phone: rider.phone || '',
            });
            toast.success(`Re-upload enabled and email sent to ${toEmail}`);
        } catch (err) {
            console.error(err);
            if (err.message?.includes('sendRiderReuploadEmail') || err.code === 'functions/not-found') {
                toast.success(`Re-upload enabled for ${name}. Deploy functions to send email automatically.`);
            } else {
                const msg = err.message || 'Failed to enable re-upload';
                toast.error(msg);
            }
        }
    };

    // ─── VENDOR ACTIONS ───────────────────────────────────────────────────────
    const approveVendor = async (vendorId, vendorName) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Approve Vendor?', text: `Activate ${vendorName} so they appear on GO7 and can receive orders?`,
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Approve', confirmButtonColor: '#10b981'
        });
        if (!isConfirmed) return;
        try {
            const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));
            const vendorData = vendorSnap.exists() ? vendorSnap.data() : {};
            const discovery = mapVendorDiscoveryFields(vendorData.type);

            await updateDoc(doc(db, 'vendors', vendorId), {
                isActive: true,
                active: true,
                isLive: true,
                approved: true,
                status: 'approved',
                accountStatus: 'active',
                canReceiveOrders: true,
                vendorType: vendorData.vendorType || discovery.vendorType,
                businessType: vendorData.businessType || discovery.businessType,
                approvedAt: serverTimestamp(),
                approvedBy: getAuth().currentUser?.uid || 'Admin',
                updatedAt: serverTimestamp(),
            });
            toast.success(`${vendorName} approved and now visible on GO7!`);
        } catch (err) { toast.error('Failed to approve vendor'); }
    };

    const deactivateVendor = async (vendorId, vendorName) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Deactivate Vendor?', text: `${vendorName} will stop receiving orders.`,
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Deactivate', confirmButtonColor: '#ef4444'
        });
        if (!isConfirmed) return;
        try {
            await updateDoc(doc(db, 'vendors', vendorId), {
                isActive: false, status: 'inactive', updatedAt: serverTimestamp()
            });
            toast.success(`${vendorName} deactivated`);
        } catch (err) { toast.error('Failed to deactivate vendor'); }
    };

    const toggleVendorFeatured = async (vendor) => {
        const vendorName = vendor.businessName || vendor.name || 'Vendor';
        const nextFeatured = !(vendor.featured === true || vendor.trending === true);
        try {
            await updateDoc(doc(db, 'vendors', vendor.id), {
                featured: nextFeatured,
                trending: nextFeatured,
                trendingOrder: nextFeatured
                    ? (typeof vendor.trendingOrder === 'number' ? vendor.trendingOrder : 100)
                    : null,
                updatedAt: serverTimestamp(),
            });
            toast.success(nextFeatured ? `${vendorName} is now featured on homepage` : `${vendorName} removed from trending`);
        } catch (err) {
            toast.error('Failed to update trending status');
        }
    };

    const updateVendorTrendingOrder = async (vendor, rawValue) => {
        const order = Number.parseInt(String(rawValue), 10);
        if (!Number.isFinite(order) || order < 1) {
            toast.error('Enter a valid order number (1 = first)');
            return;
        }
        try {
            await updateDoc(doc(db, 'vendors', vendor.id), {
                trendingOrder: order,
                featured: true,
                trending: true,
                updatedAt: serverTimestamp(),
            });
            toast.success('Trending order updated');
        } catch (err) {
            toast.error('Failed to update trending order');
        }
    };

    // ─── BOOKING ACTIONS ──────────────────────────────────────────────────────
    const updateBookingStatus = async (bookingId, newStatus) => {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: newStatus, updatedAt: serverTimestamp(), updatedBy: 'Admin'
            });
            toast.success(`Booking status updated to ${newStatus}`);
        } catch (err) { toast.error('Failed to update booking status'); }
    };

    const assignRiderToBooking = async (bookingId, riderId) => {
        if (!riderId) return;
        try {
            const fn = httpsCallable(getFunctions(), 'adminAssignRiderToDelivery');
            const res = await fn({ bookingId, riderId });
            if (!res?.data?.success) throw new Error('Assignment failed');
            toast.success('Rider assigned to booking!');
        } catch (err) {
            console.error('assignRiderToBooking failed:', err);
            toast.error(err?.message || 'Failed to assign rider');
        }
    };

    // ─── GOBUY ACTIONS ────────────────────────────────────────────────────────
    const updateGobuyStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(db, 'gobuy_orders', orderId), {
                orderStatus: newStatus, updatedAt: serverTimestamp(), updatedBy: 'Admin'
            });
            toast.success(`GoBuy status updated to ${newStatus}`);
        } catch (err) { toast.error('Failed to update GoBuy status'); }
    };

    const assignRiderToGobuy = async (orderId, riderId) => {
        if (!riderId) return;
        const rider = riders.find(r => r.id === riderId);
        try {
            await updateDoc(doc(db, 'gobuy_orders', orderId), {
                assignedRider: riderId,
                assignedRiderName: rider?.name || 'Rider',
                orderStatus: 'Assigned',
                updatedAt: serverTimestamp(),
            });
            toast.success('Rider assigned to GoBuy order!');
        } catch (err) { toast.error('Failed to assign rider'); }
    };

    // ─── AGENT IDENTITY VERIFICATION ─────────────────────────────────────────
    const verifyAgentIdentity = async (agentId, approve) => {
        const { isConfirmed } = await Swal.fire({
            title: approve ? 'Approve ID Verification?' : 'Reject ID Verification?',
            text: approve ? 'This will mark the agent as identity-verified.' : 'This will reject the agent\'s submitted ID documents.',
            icon: approve ? 'success' : 'warning', showCancelButton: true,
            confirmButtonText: approve ? 'Approve' : 'Reject',
            confirmButtonColor: approve ? '#10b981' : '#ef4444'
        });
        if (!isConfirmed) return;
        try {
            await updateDoc(doc(db, 'agents', agentId), {
                'identityVerification.verified': approve,
                'identityVerification.reviewedAt': serverTimestamp(),
                'identityVerification.reviewedBy': 'Admin',
                'identityVerification.status': approve ? 'approved' : 'rejected'
            });
            toast.success(approve ? 'Agent identity approved!' : 'Agent identity rejected');
        } catch (err) { toast.error('Failed to update agent identity status'); }
    };

    // Render functions for each tab
    const renderOrdersTab = () => {
        const STATUSES = ['all', ...ADMIN_DISPATCH_FLOW];
        const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">All Orders ({orders.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setShowBookingModal(true)}
                            className="cursor-pointer px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-semibold">
                            + Manual Booking
                        </button>
                        <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}
                            className="px-3 py-1.5 border rounded-lg text-sm cursor-pointer">
                            {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Orders' : getAdminStatusLabel(s)}</option>)}
                        </select>
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-xl shadow">No orders for this filter</div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['#', 'Customer', 'Vendor', 'Items', 'Amount', 'Status', 'Rider', 'Time', 'Actions'].map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.map(order => {
                                        const rider = riders.find(r => r.id === order.riderId);
                                        const ts = order.createdAt?.toDate ? order.createdAt.toDate() : null;
                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-3 text-xs text-gray-500 font-mono">#{order.id?.slice(-6)}</td>
                                                <td className="px-3 py-3">
                                                    <p className="text-sm font-medium text-gray-900">{order.customerName || order.userName || '—'}</p>
                                                    <p className="text-xs text-gray-400 truncate max-w-[120px]">{order.deliveryAddress || order.address || '—'}</p>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px] truncate">{order.vendorName || '—'}</td>
                                                <td className="px-3 py-3 text-xs text-gray-500">
                                                    {order.items ? `${order.items.length} item${order.items.length !== 1 ? 's' : ''}` : '—'}
                                                </td>
                                                <td className="px-3 py-3 font-bold text-sm text-gray-900">₦{(order.total || order.totalAmount || 0).toLocaleString()}</td>
                                                <td className="px-3 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAdminStatusColor(order.status)}`}>
                                                        {getAdminStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-blue-600">{rider ? (rider.name || rider.fullName) : '—'}</td>
                                                <td className="px-3 py-3 text-xs text-gray-400">{ts ? ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex gap-1 flex-wrap min-w-[200px]">
                                                        {order.status === 'pending' && (
                                                            <button onClick={() => acceptOrder(order.id)}
                                                                className="cursor-pointer px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-medium">
                                                                ✓ Accept
                                                            </button>
                                                        )}
                                                        {!order.riderId && !['delivered','completed','cancelled'].includes(order.status) && (
                                                            <select className="text-xs border rounded px-1 py-1 cursor-pointer"
                                                                onChange={e => e.target.value && assignRiderToOrder(order.id, e.target.value)}
                                                                defaultValue="">
                                                                <option value="">Assign rider…</option>
                                                                {riders.filter(r => r.approved !== false && r.status !== 'suspended').map(r => (
                                                                    <option key={r.id} value={r.id}>{r.name || r.fullName}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {ADMIN_NEXT_STATUS[order.status] && (
                                                            <button onClick={() => updateOrderStatus(order.id, ADMIN_NEXT_STATUS[order.status])}
                                                                className="cursor-pointer px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 font-medium">
                                                                → {getAdminStatusLabel(ADMIN_NEXT_STATUS[order.status])}
                                                            </button>
                                                        )}
                                                        {!['delivered','completed','cancelled'].includes(order.status) && (
                                                            <button onClick={() => cancelOrder(order.id)}
                                                                className="cursor-pointer px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200">
                                                                ✕
                                                            </button>
                                                        )}
                                                        {order.riderId && (
                                                            <button onClick={() => openLiveMap(order)}
                                                                className="cursor-pointer px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200">
                                                                🗺
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Booking modal reuse */}
                {showBookingModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-lg font-bold">Create Manual Booking</h3>
                                    <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Customer Name *', key: 'customerName', placeholder: 'Full name' },
                                        { label: 'Customer Phone', key: 'customerPhone', placeholder: '+234...' },
                                        { label: 'Pickup Address *', key: 'pickupAddress', placeholder: 'Pick up location' },
                                        { label: 'Dropoff Address *', key: 'dropoffAddress', placeholder: 'Delivery destination' },
                                        { label: 'Package Description', key: 'packageDescription', placeholder: 'What is being delivered' },
                                        { label: 'Price (₦)', key: 'estimatedPrice', placeholder: '0', type: 'number' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                                            <input type={f.type || 'text'} placeholder={f.placeholder} value={bookingForm[f.key]}
                                                onChange={e => setBookingForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Rider</label>
                                        <select value={bookingForm.riderId} onChange={e => setBookingForm(p => ({ ...p, riderId: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer">
                                            <option value="">— No rider yet —</option>
                                            {riders.filter(r => r.approved !== false && r.status !== 'suspended').map(r => (
                                                <option key={r.id} value={r.id}>{r.name || r.fullName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setShowBookingModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 text-sm">Cancel</button>
                                    <button onClick={createManualBooking} disabled={dispatchSaving}
                                        className="flex-1 cursor-pointer px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50">
                                        {dispatchSaving ? 'Creating…' : 'Create Booking'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const openRiderProfile = async (rider) => {
        try {
            const snap = await getDoc(doc(db, 'riders', rider.id));
            let data = snap.exists() ? { id: snap.id, ...snap.data() } : { ...rider };
            const userSnap = await getDoc(doc(db, 'users', rider.id));
            if (userSnap.exists()) {
                const u = userSnap.data();
                data = {
                    ...data,
                    name: data.name || data.fullName || u.displayName || u.name,
                    fullName: data.fullName || data.name || u.displayName || u.name,
                    phone: data.phone || u.phone,
                    email: data.email || u.email,
                    photoURL: data.photoURL || data.profilePhoto || u.photoURL,
                    role: u.role,
                    _fromUsersOnly: !snap.exists(),
                };
            } else if (!snap.exists()) {
                data._fromUsersOnly = true;
            }
            setSelectedRider(data);
            setRiderFleetEdit(fleetSelectValue(data));
        } catch {
            setSelectedRider(rider);
            setRiderFleetEdit(fleetSelectValue(rider));
        }
    };

    const getMergedRidersList = () => {
        const riderIds = new Set(riders.map((r) => r.id));
        const fromUsers = customers
            .filter((c) => {
                if (riderIds.has(c.id)) return false;
                const email = (c.email || '').toLowerCase();
                return c.role === 'rider' || email.endsWith('@go7.rider');
            })
            .map((c) => ({
                id: c.id,
                name: c.displayName || c.name,
                fullName: c.displayName || c.name,
                phone: c.phone,
                email: c.email,
                status: 'incomplete',
                approved: false,
                createdAt: c.createdAt,
                _fromUsersOnly: true,
            }));
        return [...riders, ...fromUsers];
    };

    const renderRidersTab = () => {
        const mergedRiders = getMergedRidersList();
        const matchesSearch = (r) => {
            if (!riderSearch.trim()) return true;
            const s = riderSearch.toLowerCase().trim();
            return (r.name || r.fullName || '').toLowerCase().includes(s) ||
                (r.phone || '').includes(s) ||
                (r.email || '').toLowerCase().includes(s);
        };
        const needsApproval = (r) => r._fromUsersOnly || !r.approved || r.status === 'pending' || r.status === 'submitted' || r.status === 'incomplete' || (r.status === 'offline' && r.approved !== true);
        const statusBadge = (rider) => {
            if (rider.status === 'rejected') return 'bg-red-100 text-red-700';
            if (rider.status === 'suspended') return 'bg-red-100 text-red-700';
            if (rider.status === 'delivering') return 'bg-yellow-100 text-yellow-700';
            if (rider.status === 'online' || rider.status === 'active') return 'bg-green-100 text-green-700';
            if (needsApproval(rider)) return 'bg-orange-100 text-orange-700';
            return 'bg-gray-100 text-gray-600';
        };
        const statusLabel = (rider) => {
            if (rider._fromUsersOnly) return 'Signup Incomplete';
            if (rider.status === 'rejected') return 'Rejected';
            if (rider.status === 'suspended') return 'Suspended';
            if (rider.status === 'delivering') return 'On Delivery';
            if (rider.status === 'online' || rider.status === 'active') return 'Approved';
            if (needsApproval(rider)) return 'Awaiting Approval';
            return rider.status || 'Offline';
        };
        const fmtDate = (r) => {
            const d = r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt ? new Date(r.createdAt) : null;
            return d ? d.toLocaleDateString() : '—';
        };
        const riderName = (r) => r.name || r.fullName || 'Unnamed Rider';
        const firstPhoto = (r) => {
            const urls = [];
            const scan = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                Object.values(obj).forEach((v) => {
                    if (typeof v === 'string' && v.startsWith('http')) urls.push(v);
                    else if (v && typeof v === 'object' && !v.toDate && v.latitude === undefined) scan(v);
                });
            };
            scan(r);
            return urls.find((u) => /\.(jpg|jpeg|png|gif|webp)/i.test(u)) || r.profilePhoto || r.photoURL || null;
        };
        const pending = [...mergedRiders].filter(needsApproval).filter(matchesSearch).sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0));
        const approved = [...mergedRiders].filter((r) => !needsApproval(r)).filter(matchesSearch).sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0));
        const incompleteOnly = mergedRiders.filter((r) => r._fromUsersOnly);

        const SubmissionCard = ({ rider }) => {
            const photo = firstPhoto(rider);
            const name = riderName(rider);
            return (
                <div className={`bg-white border-2 rounded-xl p-4 shadow-sm ${rider._fromUsersOnly ? 'border-amber-400' : 'border-orange-300'}`}>
                    <div className="flex gap-4">
                        {photo ? (
                            <img src={photo} alt="" className="w-20 h-20 rounded-lg object-cover border flex-shrink-0" />
                        ) : (
                            <div className="w-20 h-20 rounded-lg bg-orange-100 flex items-center justify-center text-2xl flex-shrink-0">🛵</div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="font-bold text-gray-900">{name}</h3>
                                    <p className="text-sm text-gray-600">{rider.phone || '—'} · {rider.email || '—'}</p>
                                    <p className="text-xs text-gray-400 mt-1">Registered {fmtDate(rider)}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap ${rider._fromUsersOnly ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-700'}`}>
                                    {rider._fromUsersOnly ? 'INCOMPLETE SIGNUP' : 'NEEDS APPROVAL'}
                                </span>
                            </div>
                            {rider._fromUsersOnly ? (
                                <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                                    Account exists in Firebase Auth but rider profile/documents were not saved to Firestore. Approve to create their rider profile, or check Customers tab for their phone.
                                </p>
                            ) : (
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                                <p><span className="text-gray-400">Vehicle:</span> {formatFleetLabel(rider)}</p>
                                <p><span className="text-gray-400">Plate:</span> {rider.plateNumber || rider.vehicleNumber || '—'}</p>
                                <p><span className="text-gray-400">License:</span> {rider.licenseNumber || rider.driversLicense || '—'}</p>
                                <p><span className="text-gray-400">Address:</span> {rider.address || '—'}</p>
                            </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-orange-100">
                        <button type="button" onClick={() => openRiderProfile(rider)}
                            className="cursor-pointer px-3 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-200">
                            Review Full Submission
                        </button>
                        <button type="button" onClick={() => approveRider(rider.id, name)}
                            className="cursor-pointer px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700">
                            ✓ Approve Rider
                        </button>
                        <button type="button" onClick={() => rejectRider(rider.id, name)}
                            className="cursor-pointer px-4 py-2 bg-red-100 text-red-700 text-sm font-bold rounded-lg hover:bg-red-200 border border-red-200">
                            ✗ Reject
                        </button>
                        <button type="button" onClick={() => requestRiderReupload(rider)}
                            className="cursor-pointer px-3 py-2 bg-blue-50 text-blue-800 text-sm font-medium rounded-lg hover:bg-blue-100 border border-blue-200">
                            ✉ Request Re-upload
                        </button>
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Rider Applications</h2>
                        <p className="text-sm text-gray-500">Review what each rider submitted, then approve or reject.</p>
                        {incompleteOnly.length > 0 && (
                            <p className="text-xs text-amber-700 mt-1">{incompleteOnly.length} signup(s) only saved login — profile may be missing from Firestore.</p>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="Search name, phone, email (e.g. Wahab)..."
                        value={riderSearch}
                        onChange={(e) => setRiderSearch(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm w-full sm:w-72"
                    />
                    <button
                        type="button"
                        onClick={testGo7Email}
                        className="cursor-pointer px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border whitespace-nowrap"
                        title="Send test email via Resend to verify configuration"
                    >
                        ✉ Test Email
                    </button>
                </div>

                {/* Pending approval queue */}
                <div>
                    <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                        Awaiting Approval ({pending.length})
                    </h3>
                    {pending.length === 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 text-sm">
                            ✓ No pending rider applications — all caught up!
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {pending.map((r) => <SubmissionCard key={r.id} rider={r} />)}
                        </div>
                    )}
                </div>

                {/* All approved / active riders */}
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                        Approved &amp; Active Riders ({approved.length})
                    </h3>
                    {mergedRiders.length === 0 ? (
                        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
                            <div className="text-4xl mb-3">🛵</div>
                            <p className="font-medium">No riders in Firebase yet</p>
                            <p className="text-sm mt-2">Try the <button type="button" onClick={() => setActiveTab('customers')} className="text-red-600 underline">Customers</button> tab and search by name or phone.</p>
                        </div>
                    ) : approved.length === 0 && pending.length === 0 ? (
                        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                            <p>No riders match &ldquo;{riderSearch}&rdquo;</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow overflow-hidden border">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['Rider', 'Phone', 'Registered', 'Vehicle', 'Status', 'Actions'].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {approved.map((rider) => (
                                            <tr key={rider.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{riderName(rider)}</td>
                                                <td className="px-4 py-3">{rider.phone || '—'}</td>
                                                <td className="px-4 py-3">{fmtDate(rider)}</td>
                                                <td className="px-4 py-3">{formatFleetLabel(rider)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(rider)}`}>{statusLabel(rider)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2 flex-wrap">
                                                        <button type="button" onClick={() => openRiderProfile(rider)}
                                                            className="cursor-pointer px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700">
                                                            View Profile
                                                        </button>
                                                        {rider.status !== 'suspended' && (
                                                            <button type="button" onClick={() => suspendRider(rider.id, riderName(rider))}
                                                                className="cursor-pointer px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">
                                                                Suspend
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderVendorsTab = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Vendors Management ({vendors.length} total)</h2>
                <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{vendors.filter(v => v.isActive !== false).length} active</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">{vendors.filter(v => v.isActive === false || v.status === 'pending').length} pending</span>
                </div>
            </div>

            {vendors.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
                    <div className="text-4xl mb-3">🏪</div>
                    <p className="font-medium">No vendors registered yet</p>
                    <p className="text-sm mt-1">Vendors who sign up will appear here for approval.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Vendor', 'Category', 'Trending', 'Orders', 'Revenue', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {vendors.map(vendor => {
                                    const vOrders = orders.filter(o => o.vendorId === vendor.id);
                                    const vRevenue = vOrders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((s, o) => s + (o.total || o.totalAmount || 0), 0);
                                    const isPending = vendor.isActive === false || vendor.status === 'pending' || vendor.approved === false;
                                    return (
                                        <tr key={vendor.id} className={`hover:bg-gray-50 ${isPending ? 'bg-orange-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                                                        {(vendor.businessName || vendor.name || 'V').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-sm">{vendor.businessName || vendor.name || 'Unnamed'}</p>
                                                        <p className="text-xs text-gray-400">{vendor.email || vendor.id?.slice(-8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{vendor.category || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => toggleVendorFeatured(vendor)}
                                                        className={`cursor-pointer px-2 py-1 text-xs rounded-lg font-medium ${
                                                            vendor.featured || vendor.trending
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {vendor.featured || vendor.trending ? '⭐ Featured' : '+ Feature'}
                                                    </button>
                                                    {(vendor.featured || vendor.trending) && (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            defaultValue={vendor.trendingOrder ?? 100}
                                                            onBlur={(e) => updateVendorTrendingOrder(vendor, e.target.value)}
                                                            className="w-16 px-1 py-0.5 text-xs border border-gray-200 rounded"
                                                            title="Lower number shows first on homepage"
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-700">{vOrders.length}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">₦{vRevenue.toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                    {isPending ? 'Pending' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {isPending && (
                                                        <button onClick={() => approveVendor(vendor.id, vendor.businessName || vendor.name || 'Vendor')}
                                                            className="cursor-pointer px-2.5 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-medium">
                                                            ✓ Approve
                                                        </button>
                                                    )}
                                                    {!isPending && (
                                                        <button onClick={() => deactivateVendor(vendor.id, vendor.businessName || vendor.name || 'Vendor')}
                                                            className="cursor-pointer px-2.5 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 font-medium">
                                                            Deactivate
                                                        </button>
                                                    )}
                                                    <button onClick={() => openVendorEditModal(vendor)}
                                                        className="cursor-pointer px-2.5 py-1 bg-blue-100 text-blue-600 text-xs rounded-lg hover:bg-blue-200 font-medium">
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Vendor Edit Modal */}
            {editingVendor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Vendor Details</h3>
                                <button
                                    onClick={() => setEditingVendor(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={vendorEditForm.businessName}
                                        onChange={(e) => setVendorEditForm(prev => ({ ...prev, businessName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter business name"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={vendorEditForm.name}
                                        onChange={(e) => setVendorEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter display name (optional)"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        value={vendorEditForm.category}
                                        onChange={(e) => setVendorEditForm(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Restaurant, Pharmacy, Grocery"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        value={vendorEditForm.address}
                                        onChange={(e) => setVendorEditForm(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter vendor address"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setEditingVendor(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={updateVendorDetails}
                                    disabled={!vendorEditForm.businessName.trim()}
                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const handleSupportTicket = async (ticketId, action, vendorChanges = null) => {
        try {
            const ticket = supportTickets.find(t => t.id === ticketId);
            if (!ticket) return;

            let updateData = {
                status: action === 'approve' ? 'resolved' : action === 'reject' ? 'rejected' : 'resolved',
                processedAt: serverTimestamp(),
                processedBy: 'Admin'
            };

            if (action === 'approve' && ticket.type === 'profile_edit_request' && vendorChanges) {
                // Apply vendor changes
                const vendorRef = doc(db, 'vendors', ticket.vendorId);
                await updateDoc(vendorRef, {
                    ...vendorChanges,
                    profileEditCount: (vendors.find(v => v.id === ticket.vendorId)?.profileEditCount || 0) + 1,
                    lastProfileEdit: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastModifiedBy: 'Admin (Support)'
                });

                updateData.adminNotes = 'Profile changes approved and applied';
            } else if (action === 'reject') {
                updateData.adminNotes = 'Profile change request rejected';
            }

            // Update ticket
            await updateDoc(doc(db, 'supportTickets', ticketId), updateData);

            // Notify vendor
            await addDoc(collection(db, 'vendorNotifications'), {
                vendorId: ticket.vendorId,
                type: 'support_ticket_update',
                title: `Support Request ${action === 'approve' ? 'Approved' : 'Update'}`,
                message: action === 'approve' 
                    ? 'Your profile change request has been approved and applied.'
                    : 'Your support request has been updated. Please check for details.',
                read: false,
                createdAt: serverTimestamp()
            });

            toast.success(`Support ticket ${action}ed successfully!`);

        } catch (error) {
            console.error('Error handling support ticket:', error);
            toast.error('Failed to process support ticket');
        }
    };

    const renderSupportTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Support Tickets</h2>
                <div className="text-sm text-gray-600">
                    {supportTickets.filter(t => t.status === 'open').length} open tickets
                </div>
            </div>

            <div className="grid gap-4">
                {supportTickets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No support tickets yet
                    </div>
                ) : (
                    supportTickets.map(ticket => (
                        <div key={ticket.id} className={`bg-white p-4 rounded-lg shadow border-l-4 ${
                            ticket.status === 'open' ? 'border-orange-500' : 
                            ticket.status === 'resolved' ? 'border-green-500' : 'border-red-500'
                        }`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="font-semibold text-lg text-gray-900">{ticket.subject}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            ticket.status === 'open' ? 'bg-orange-100 text-orange-800' :
                                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {ticket.status?.toUpperCase()}
                                        </span>
                                        {ticket.type === 'profile_edit_request' && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                Profile Edit
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-gray-700 font-medium">{ticket.vendorName}</p>
                                        <p className="text-gray-600">{ticket.message}</p>
                                        <p className="text-sm text-gray-500">
                                            Created: {ticket.createdAt?.toDate?.()?.toLocaleString()}
                                        </p>
                                        {ticket.processedAt && (
                                            <p className="text-sm text-gray-500">
                                                Processed: {ticket.processedAt?.toDate?.()?.toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {ticket.status === 'open' && ticket.type === 'profile_edit_request' && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</p>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={async () => {
                                                const { value: changes } = await Swal.fire({
                                                    title: 'Approve Profile Changes',
                                                    html: `
                                                        <div class="space-y-3">
                                                            <div>
                                                                <label class="block text-sm font-medium mb-1">Business Name:</label>
                                                                <input id="businessName" class="w-full px-3 py-2 border rounded" 
                                                                       placeholder="Enter new business name" />
                                                            </div>
                                                            <div>
                                                                <label class="block text-sm font-medium mb-1">Category:</label>
                                                                <input id="category" class="w-full px-3 py-2 border rounded" 
                                                                       placeholder="Enter category" />
                                                            </div>
                                                            <div>
                                                                <label class="block text-sm font-medium mb-1">Address:</label>
                                                                <textarea id="address" class="w-full px-3 py-2 border rounded" 
                                                                          placeholder="Enter address" rows="2"></textarea>
                                                            </div>
                                                        </div>
                                                    `,
                                                    focusConfirm: false,
                                                    showCancelButton: true,
                                                    confirmButtonText: 'Apply Changes',
                                                    preConfirm: () => {
                                                        const businessName = document.getElementById('businessName').value;
                                                        const category = document.getElementById('category').value;
                                                        const address = document.getElementById('address').value;
                                                        if (!businessName) {
                                                            Swal.showValidationMessage('Business name is required');
                                                            return false;
                                                        }
                                                        return { businessName, category, address, name: businessName };
                                                    }
                                                });
                                                if (changes) {
                                                    handleSupportTicket(ticket.id, 'approve', changes);
                                                }
                                            }}
                                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                        >
                                            ✓ Approve & Apply Changes
                                        </button>
                                        <button
                                            onClick={() => handleSupportTicket(ticket.id, 'reject')}
                                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                        >
                                            ✗ Reject Request
                                        </button>
                                    </div>
                                </div>
                            )}

                            {ticket.status === 'open' && ticket.type !== 'profile_edit_request' && (
                                <div className="mt-4 flex space-x-2">
                                    <button
                                        onClick={() => handleSupportTicket(ticket.id, 'resolve')}
                                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                    >
                                        Mark as Resolved
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderPaymentsTab = () => (
        <div className="space-y-6">
            <PaymentAnomalies />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-800">Payments & Payouts Management</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => runVendorWalletBackfill(true)}
                        disabled={payoutBackfillRunning}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Preview wallet backfill
                    </button>
                    <button
                        onClick={async () => {
                            const confirm = await Swal.fire({
                                title: 'Backfill vendor wallets?',
                                text: 'Initializes wallet fields and credits earnings from past delivered orders (8% commission).',
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: 'Run backfill',
                                confirmButtonColor: '#E0001B',
                            });
                            if (confirm.isConfirmed) runVendorWalletBackfill(false);
                        }}
                        disabled={payoutBackfillRunning}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        {payoutBackfillRunning ? 'Running…' : 'Backfill vendor wallets'}
                    </button>
                </div>
            </div>
            
            {/* Payout Requests Section */}
            <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Vendor Payout Requests</h3>
                        <span className="text-sm text-gray-500">
                            {payoutRequests.filter(p => p.status === 'pending' || p.status === 'processing' || p.status === 'failed').length} need action
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        New withdrawals auto-trigger Paystack transfer. Use Retry if a transfer fails.
                    </p>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {payoutRequests.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No payout requests yet
                        </div>
                    ) : (
                        payoutRequests.map(payout => {
                            const vendorLabel = payout.vendorName || vendors.find(v => v.id === payout.vendorId)?.businessName || payout.vendorId?.slice(0, 8);
                            const bank = payout.bankDetails;
                            return (
                            <div key={payout.id} className="p-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                            <h4 className="font-semibold text-gray-900">{vendorLabel}</h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                payout.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                payout.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                payout.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {(payout.status || 'unknown').toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Requested: {payout.createdAt?.toDate?.()?.toLocaleString?.() || payout.requestedAt?.toDate?.()?.toLocaleString?.() || '—'}
                                        </p>
                                        {bank && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                Bank: {bank.bankName} · {bank.accountName} · ****{String(bank.accountNumber || '').slice(-4)}
                                            </p>
                                        )}
                                        {payout.reference && (
                                            <p className="text-xs text-gray-500 mt-1 font-mono">Ref: {payout.reference}</p>
                                        )}
                                        {payout.paystackReference && payout.paystackReference !== payout.reference && (
                                            <p className="text-xs text-gray-500 font-mono">Paystack: {payout.paystackReference}</p>
                                        )}
                                        {payout.processedAt && (
                                            <p className="text-sm text-gray-600">
                                                Processed: {payout.processedAt?.toDate?.()?.toLocaleString?.()}
                                            </p>
                                        )}
                                        {payout.failureReason && (
                                            <p className="text-sm text-red-600 mt-1">Error: {payout.failureReason}</p>
                                        )}
                                        {payout.adminNotes && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                Notes: {payout.adminNotes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xl font-bold text-gray-900">₦{payout.amount?.toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                {['pending', 'failed', 'processing'].includes(payout.status) && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button 
                                            onClick={() => approvePayout(payout)}
                                            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                                        >
                                            <span>{payout.status === 'failed' ? '↻' : '✓'}</span>
                                            <span>{payout.status === 'failed' ? 'Retry Paystack' : 'Send via Paystack'}</span>
                                        </button>
                                        <button 
                                            onClick={() => markPayoutPaidManually(payout)}
                                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                                        >
                                            <span>✓</span>
                                            <span>Mark paid manually</span>
                                        </button>
                                        {payout.status !== 'processing' && (
                                            <button 
                                                onClick={() => rejectPayout(payout)}
                                                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                            >
                                                <span>✗</span>
                                                <span>Reject & refund</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Regular Payments Section */}
            <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Order Payments</h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {payments.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No payments yet
                        </div>
                    ) : (
                        payments.map(payment => (
                            <div key={payment.id} className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">Payment #{payment.id?.slice(-8)}</h4>
                                        <p className="text-gray-600">{payment.vendorName}</p>
                                        <p className="text-sm text-gray-500">Order: #{payment.orderId?.slice(-8)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold">₦{payment.amount?.toLocaleString()}</p>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {payment.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                
                                {payment.status === 'pending' && (
                                    <div className="mt-3">
                                        <button
                                            onClick={async () => {
                                                const result = await Swal.fire({
                                                    title: 'Process Payment',
                                                    text: `Mark ₦${payment.amount?.toLocaleString()} payment to ${payment.vendorName} as completed?`,
                                                    icon: 'question',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#ef4444',
                                                    confirmButtonText: 'Yes, Mark Paid'
                                                });
                                                if (result.isConfirmed) {
                                                    try {
                                                        await updateDoc(doc(db, 'payments', payment.id), {
                                                            status: 'completed',
                                                            processedAt: serverTimestamp(),
                                                            processedBy: getAuth().currentUser?.uid
                                                        });
                                                        toast.success('Payment marked as completed');
                                                    } catch (err) {
                                                        console.error(err);
                                                        toast.error('Failed to process payment');
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                        >
                                            Process Payment
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    // ─── DISPATCH CENTER ──────────────────────────────────────────────────────
    const renderDispatchTab = () => {
        const STATUS_FLOW = ADMIN_DISPATCH_FLOW;
        const statusLabel = (s) => getAdminStatusLabel(s);
        const statusColor = (s) => getAdminStatusColor(s);
        const nextStatus = ADMIN_NEXT_STATUS;

        const bookingAsOrder = (b) => ({
            id: b.id || b.bookingId,
            status: b.status || 'pending',
            customerName: b.senderName || b.customer?.name || b.customerName,
            deliveryAddress: b.dropoffAddress || b.dropoff?.address || b.destination?.address,
            pickupAddress: b.pickupAddress || b.pickup?.address,
            total: b.fare || b.fareNaira || b.payment?.total || b.estimatedFare,
            riderId: b.riderId || b.assignedRider?.id,
            createdAt: b.createdAt || b.timestamp,
            _isBooking: true,
        });

        const deliveryOrders = [
            ...bookings.filter((b) => (b.id || '').match(/^Go7-/i) || (b.bookingId || '').match(/^Go7-/i)).map(bookingAsOrder),
            ...orders.filter((o) => (o.id || '').match(/^Go7-/i) || o.bookingId?.match(/^Go7-/i)),
        ];

        const deduped = [];
        const seen = new Set();
        for (const o of deliveryOrders) {
            if (!o.id || seen.has(o.id)) continue;
            seen.add(o.id);
            deduped.push(o);
        }

        const incoming  = deduped.filter(o => isIncomingDeliveryStatus(o.status));
        const active    = deduped.filter(o => isActiveDeliveryStatus(o.status));
        const completed = deduped.filter(o => { const d = o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt ? new Date(o.createdAt) : null; const today = new Date(); return d && d.toDateString() === today.toDateString() && (o.status === 'delivered' || o.status === 'completed'); });
        const allActive = deduped.filter(o => !['delivered','completed','cancelled'].includes(o.status));

        const urgentPaidNoRider = deduped.filter((o) => {
            const raw = bookings.find((b) => (b.id || b.bookingId) === o.id) || o;
            return isPaidBooking(raw) &&
                !o.riderId &&
                ['pending', 'searching_rider', 'pending_dispatch'].includes(o.status);
        });

        const refundAlerts = adminAlerts.filter((a) => a.type === 'paid_booking_cancelled' && !a.read);

        const markAlertRead = async (alertId) => {
            try {
                await updateDoc(doc(db, 'adminAlerts', alertId), { read: true, readAt: serverTimestamp() });
            } catch (_) {}
        };

        const renderOrderCard = (order, showAssign = true) => {
            const rider = riders.find(r => r.id === order.riderId);
            const vendor = vendors.find(v => v.id === order.vendorId);
            const ts = order.createdAt?.toDate ? order.createdAt.toDate() : null;
            return (
                <div key={order.id} className={`bg-white rounded-lg border-l-4 p-4 shadow-sm ${order.status === 'pending' ? 'border-yellow-400' : order.status === 'delivered' ? 'border-green-400' : 'border-red-500'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900">#{order.id?.slice(-8)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                                {ts && <span className="text-xs text-gray-400">{ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>}
                            </div>
                            <p className="font-semibold text-gray-800 mt-1">{order.customerName || order.userName || '—'}</p>
                            <p className="text-xs text-gray-500">📍 {order.deliveryAddress || order.pickupAddress || order.address || '—'}</p>
                            {order.pickupAddress && order.deliveryAddress && (
                                <p className="text-xs text-gray-400">From: {order.pickupAddress}</p>
                            )}
                            {vendor && <p className="text-xs text-gray-400 mt-0.5">🏪 {vendor.businessName || vendor.name}</p>}
                        </div>
                        <div className="text-right ml-3">
                            <p className="text-lg font-bold text-red-600">₦{(order.total || order.totalAmount || 0).toLocaleString()}</p>
                            {rider && <p className="text-xs text-blue-600 font-medium mt-1">🛵 {rider.name || rider.fullName}</p>}
                        </div>
                    </div>

                    {/* Order items summary */}
                    {order.items && order.items.length > 0 && (
                        <div className="text-xs text-gray-500 mb-2 bg-gray-50 rounded px-2 py-1">
                            {order.items.slice(0, 3).map((item, i) => <span key={i}>{i > 0 && ' · '}{item.name || item.productName}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>)}
                            {order.items.length > 3 && <span> +{order.items.length - 3} more</span>}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {/* Accept if pending */}
                        {order.status === 'pending' && (
                            <button onClick={() => acceptOrder(order.id)}
                                className="cursor-pointer px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-semibold">
                                ✓ Accept
                            </button>
                        )}

                        {/* Assign rider if no rider yet */}
                        {showAssign && !order.riderId && order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <select className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
                                onChange={e => e.target.value && assignRiderToOrder(order.id, e.target.value)}
                                defaultValue="">
                                <option value="">🛵 Assign rider…</option>
                                {riders.filter(r => r.approved !== false && r.status !== 'suspended').map(r => (
                                    <option key={r.id} value={r.id}>{r.name || r.fullName} {r.status === 'online' ? '🟢' : r.status === 'delivering' ? '🟡' : '⚪'}</option>
                                ))}
                            </select>
                        )}

                        {/* Next status button */}
                        {nextStatus[order.status] && order.status !== 'pending' && (
                            <button onClick={() => updateOrderStatus(order.id, nextStatus[order.status])}
                                className="cursor-pointer px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 font-semibold">
                                → {statusLabel(nextStatus[order.status])}
                            </button>
                        )}

                        {/* Full status dropdown */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <select className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
                                value={order.status}
                                onChange={e => e.target.value && e.target.value !== order.status && updateOrderStatus(order.id, e.target.value)}>
                                {STATUS_FLOW.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                            </select>
                        )}

                        {/* Map */}
                        {order.riderId && (
                            <button onClick={() => openLiveMap(order)}
                                className="cursor-pointer px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
                                🗺 Map
                            </button>
                        )}

                        {/* Cancel */}
                        {!['delivered','completed','cancelled'].includes(order.status) && (
                            <button onClick={() => cancelOrder(order.id)}
                                className="cursor-pointer px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 border border-red-200">
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6">
                {(urgentPaidNoRider.length > 0 || refundAlerts.length > 0) && (
                    <div className="space-y-3">
                        {urgentPaidNoRider.length > 0 && (
                            <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 animate-pulse">
                                <h3 className="text-lg font-bold text-red-800">
                                    🔴 {urgentPaidNoRider.length} paid — no rider yet (assign now)
                                </h3>
                                <p className="text-sm text-red-700 mt-1">Customers already paid. Delay causes cancellations and refund requests.</p>
                                <div className="mt-3 space-y-2">
                                    {urgentPaidNoRider.slice(0, 5).map((o) => {
                                        const raw = bookings.find((b) => (b.id || b.bookingId) === o.id) || o;
                                        const mins = getBookingAgeMinutes(raw);
                                        return (
                                            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg p-3 border border-red-200">
                                                <div>
                                                    <span className="font-bold text-gray-900">{o.id}</span>
                                                    <span className="ml-2 text-sm text-gray-600">{o.customerName || 'Customer'}</span>
                                                    <span className="ml-2 text-xs text-red-600">{mins > 0 ? `${mins}m waiting` : 'just now'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-green-700">₦{(o.total || 0).toLocaleString()}</span>
                                                    <select className="text-xs border rounded px-2 py-1"
                                                        onChange={(e) => e.target.value && assignRiderToBooking(o.id, e.target.value)}
                                                        defaultValue="">
                                                        <option value="">Assign rider…</option>
                                                        {getAvailableRiders().map((r) => (
                                                            <option key={r.id} value={r.id}>{r.name || r.fullName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {refundAlerts.length > 0 && (
                            <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
                                <h3 className="text-lg font-bold text-amber-900">⚠️ {refundAlerts.length} paid cancellation(s) — review refund</h3>
                                <div className="mt-2 space-y-2">
                                    {refundAlerts.slice(0, 5).map((a) => (
                                        <div key={a.id} className="flex justify-between items-start gap-2 bg-white rounded p-3 border border-amber-200 text-sm">
                                            <div>
                                                <p className="font-semibold">{a.bookingId}</p>
                                                <p className="text-gray-600">{a.message}</p>
                                            </div>
                                            <button type="button" onClick={() => markAlertRead(a.id)}
                                                className="text-xs px-2 py-1 bg-amber-600 text-white rounded shrink-0">
                                                Mark reviewed
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {/* Header + action buttons */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Dispatch Center</h2>
                        <p className="text-sm text-gray-500">{allActive.length} active · {incoming.length} need attention</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setActiveTab('pricing'); navigate('/admin/pricing'); }}
                            className="cursor-pointer px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold shadow">
                            💰 Fare Settings
                        </button>
                        <button onClick={() => setShowBookingModal(true)}
                            className="cursor-pointer px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-semibold shadow">
                            + New Manual Booking
                        </button>
                        <button onClick={() => setShowSupportModal(true)}
                            className="cursor-pointer px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 font-semibold">
                            + Log Support Issue
                        </button>
                    </div>
                </div>

                {/* Incoming queue */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${incoming.length > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`}></span>
                        <h3 className="font-bold text-gray-800">Incoming Orders <span className="text-yellow-600">({incoming.length})</span></h3>
                        <span className="text-xs text-gray-400">— requires Accept + Rider Assignment</span>
                    </div>
                    {incoming.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">No pending orders right now</div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                            {incoming.map(o => renderOrderCard(o, true))}
                        </div>
                    )}
                </div>

                {/* Active orders */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${active.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></span>
                        <h3 className="font-bold text-gray-800">Active Dispatch <span className="text-blue-600">({active.length})</span></h3>
                    </div>
                    {active.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">No orders in progress</div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                            {active.map(o => renderOrderCard(o, true))}
                        </div>
                    )}
                </div>

                {/* Completed today */}
                {completed.length > 0 && (
                    <div>
                        <h3 className="font-bold text-gray-800 mb-3">✅ Completed Today <span className="text-green-600">({completed.length})</span></h3>
                        <div className="grid md:grid-cols-2 gap-3">
                            {completed.map(o => renderOrderCard(o, false))}
                        </div>
                    </div>
                )}

                {/* Create Manual Booking Modal */}
                {showBookingModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-lg font-bold text-gray-900">Create Manual Booking</h3>
                                    <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Customer Name *', key: 'customerName', placeholder: 'Full name' },
                                        { label: 'Customer Phone', key: 'customerPhone', placeholder: '+234...' },
                                        { label: 'Pickup Address *', key: 'pickupAddress', placeholder: 'Where to pick up from' },
                                        { label: 'Dropoff Address *', key: 'dropoffAddress', placeholder: 'Where to deliver to' },
                                        { label: 'Package Description', key: 'packageDescription', placeholder: 'What is being delivered' },
                                        { label: 'Estimated Price (₦)', key: 'estimatedPrice', placeholder: '0', type: 'number' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                                            <input type={f.type || 'text'} placeholder={f.placeholder}
                                                value={bookingForm[f.key]}
                                                onChange={e => setBookingForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Rider (optional)</label>
                                        <select value={bookingForm.riderId} onChange={e => setBookingForm(p => ({ ...p, riderId: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                                            <option value="">— Select rider —</option>
                                            {riders.filter(r => r.approved !== false && r.status !== 'suspended').map(r => (
                                                <option key={r.id} value={r.id}>{r.name || r.fullName} ({r.status || 'offline'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setShowBookingModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                                        Cancel
                                    </button>
                                    <button onClick={createManualBooking} disabled={dispatchSaving}
                                        className="flex-1 cursor-pointer px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm disabled:opacity-50">
                                        {dispatchSaving ? 'Creating…' : 'Create Booking'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Log Support Issue Modal */}
                {showSupportModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-lg font-bold text-gray-900">Log Support Issue</h3>
                                    <button onClick={() => setShowSupportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Customer Name', key: 'customerName', placeholder: 'Name or Walk-in' },
                                        { label: 'Customer Phone', key: 'customerPhone', placeholder: '+234...' },
                                        { label: 'Subject *', key: 'subject', placeholder: 'Brief title of the issue' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                                            <input type="text" placeholder={f.placeholder}
                                                value={supportForm[f.key]}
                                                onChange={e => setSupportForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                                            <select value={supportForm.type} onChange={e => setSupportForm(p => ({ ...p, type: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                {['complaint','query','refund_request','missing_item','wrong_order','other'].map(t => (
                                                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                                            <select value={supportForm.priority} onChange={e => setSupportForm(p => ({ ...p, priority: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                {['low','medium','high','urgent'].map(p => (
                                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
                                        <textarea rows={4} placeholder="Describe the issue in detail…"
                                            value={supportForm.description}
                                            onChange={e => setSupportForm(p => ({ ...p, description: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setShowSupportModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                                        Cancel
                                    </button>
                                    <button onClick={logSupportIssue} disabled={dispatchSaving}
                                        className="flex-1 cursor-pointer px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold text-sm disabled:opacity-50">
                                        {dispatchSaving ? 'Saving…' : 'Log Issue'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ─── COMMAND CENTER (Overview) ────────────────────────────────────────────
    const renderOverviewTab = () => {
        const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

        const pendingRiders  = getMergedRidersList().filter(r => !r.approved || r.status === 'pending' || r.status === 'submitted' || r.status === 'incomplete' || r._fromUsersOnly);
        const suspendedRiders = riders.filter(r => r.status === 'suspended');
        const pendingVendors = vendors.filter(v => v.status === 'pending' || v.approved === false || (!v.isActive && !v.status));
        const pendingPayouts = payoutRequests.filter(p => p.status === 'pending');
        const openTickets    = supportTickets.filter(t => t.status === 'open');
        const pendingAgents  = agentsList.filter(a => a.identityVerification && !a.identityVerification.verified && a.identityVerification.status !== 'rejected');
        const activeOrders   = [...orders, ...bookings.filter(b => (b.id || '').match(/^Go7-/i))].filter(o => isActiveDeliveryStatus(o.status));
        const urgentPaidCount = bookings.filter((b) =>
            isPaidBooking(b) &&
            !b.riderId &&
            ['pending', 'searching_rider', 'pending_dispatch'].includes(b.status)
        ).length;
        const refundReviewCount = adminAlerts.filter((a) => a.type === 'paid_booking_cancelled' && !a.read).length;

        const goToTab = (tabId) => {
            setActiveTab(tabId);
            const path = TAB_TO_PATH[tabId];
            if (path && location.pathname !== path) navigate(path);
        };
        const todayStart     = new Date(); todayStart.setHours(0,0,0,0);
        const todayOrders    = orders.filter(o => { const d = o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt ? new Date(o.createdAt) : null; return d && d >= todayStart; });

        const totalAlerts = pendingRiders.length + pendingVendors.length + pendingPayouts.length + openTickets.length + pendingAgents.length + urgentPaidCount + refundReviewCount;

        return (
            <div className="space-y-6">
                {/* Title bar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">GO7 Command Center</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Everything that needs your attention, right here.</p>
                    </div>
                    {totalAlerts > 0 && (
                        <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-full animate-pulse">
                            {totalAlerts} action{totalAlerts !== 1 ? 's' : ''} needed
                        </span>
                    )}
                </div>

                {/* Live stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Active Orders",    value: activeOrders.length,  icon: '🔴', color: 'border-red-500',    tab: 'dispatch' },
                        { label: "Today's Orders",   value: todayOrders.length,   icon: '📦', color: 'border-orange-400', tab: 'orders' },
                        { label: 'Online Riders',    value: riders.filter(r => r.status === 'online' || r.status === 'delivering').length, icon: '🛵', color: 'border-blue-400', tab: 'riders' },
                        { label: 'Fare Settings',    value: '₦', icon: '💰', color: 'border-green-500', tab: 'pricing' },
                    ].map((s, i) => (
                        <button key={i} onClick={() => goToTab(s.tab)}
                            className={`cursor-pointer bg-white rounded-xl shadow p-4 border-l-4 ${s.color} text-left hover:shadow-lg hover:scale-105 transition-all`}>
                            <div className="text-xl mb-1">{s.icon}</div>
                            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                            <div className="text-xs text-gray-500 font-medium mt-1">{s.label}</div>
                            <div className="text-xs text-red-500 font-semibold mt-1">Tap to manage →</div>
                        </button>
                    ))}
                </div>

                {/* PENDING ACTIONS QUEUE */}
                {totalAlerts === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                        <div className="text-3xl mb-2">✅</div>
                        <p className="font-semibold text-green-800">All clear — no pending actions</p>
                        <p className="text-sm text-green-600 mt-1">New riders, vendors, payouts and support tickets will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                            Pending Actions
                        </h3>

                        {/* Pending Riders */}
                        {pendingRiders.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-yellow-200">
                                <div className="px-5 py-3 border-b border-yellow-100 flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">🛵 Riders Awaiting Approval <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">{pendingRiders.length}</span></span>
                                    <button onClick={() => setActiveTab('riders')} className="text-xs text-red-500 hover:underline">View all riders →</button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {pendingRiders.slice(0, 5).map(rider => (
                                        <div key={rider.id} className="px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{rider.name || rider.fullName || 'Unnamed Rider'}</p>
                                                <p className="text-xs text-gray-400">{rider.phone || rider.email || rider.id?.slice(-8)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => approveRider(rider.id, rider.name || rider.fullName || 'Rider')}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-medium">
                                                    ✓ Approve
                                                </button>
                                                <button onClick={() => suspendRider(rider.id, rider.name || 'Rider')}
                                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 font-medium">
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Vendors */}
                        {pendingVendors.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-orange-200">
                                <div className="px-5 py-3 border-b border-orange-100 flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">🏪 Vendors Awaiting Approval <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">{pendingVendors.length}</span></span>
                                    <button onClick={() => setActiveTab('vendors')} className="text-xs text-red-500 hover:underline">View all vendors →</button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {pendingVendors.slice(0, 5).map(vendor => (
                                        <div key={vendor.id} className="px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{vendor.businessName || vendor.name || 'Unnamed Vendor'}</p>
                                                <p className="text-xs text-gray-400">{vendor.category || vendor.email || vendor.id?.slice(-8)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => approveVendor(vendor.id, vendor.businessName || vendor.name || 'Vendor')}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-medium">
                                                    ✓ Approve
                                                </button>
                                                <button onClick={() => deactivateVendor(vendor.id, vendor.businessName || 'Vendor')}
                                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 font-medium">
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Payouts */}
                        {pendingPayouts.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-blue-200">
                                <div className="px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">💰 Payout Requests <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{pendingPayouts.length}</span></span>
                                    <button onClick={() => setActiveTab('payments')} className="text-xs text-red-500 hover:underline">View all payments →</button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {pendingPayouts.slice(0, 5).map(payout => (
                                        <div key={payout.id} className="px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{payout.vendorName || 'Unknown vendor'}</p>
                                                <p className="text-xs text-gray-400">{payout.createdAt?.toDate?.()?.toLocaleDateString() || '—'}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-900 text-sm">{fmt(payout.amount)}</span>
                                                <button onClick={() => approvePayout(payout)}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-medium">
                                                    ✓ Approve
                                                </button>
                                                <button onClick={() => rejectPayout(payout)}
                                                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 font-medium">
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Open Support Tickets */}
                        {openTickets.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-purple-200">
                                <div className="px-5 py-3 border-b border-purple-100 flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">💬 Open Support Tickets <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{openTickets.length}</span></span>
                                    <button onClick={() => setActiveTab('support')} className="text-xs text-red-500 hover:underline">View all tickets →</button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {openTickets.slice(0, 4).map(ticket => (
                                        <div key={ticket.id} className="px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{ticket.subject || ticket.title || 'Support request'}</p>
                                                <p className="text-xs text-gray-400">{ticket.userName || ticket.userEmail || '—'} · {ticket.createdAt?.toDate?.()?.toLocaleDateString() || '—'}</p>
                                            </div>
                                            <button onClick={() => setActiveTab('support')}
                                                className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 font-medium">
                                                Respond →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Agent ID Verifications */}
                        {pendingAgents.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-indigo-200">
                                <div className="px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">🤝 Agent ID Verifications <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">{pendingAgents.length}</span></span>
                                    <button onClick={() => setActiveTab('agents')} className="text-xs text-red-500 hover:underline">View all agents →</button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {pendingAgents.slice(0, 4).map(agent => (
                                        <div key={agent.id} className="px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{agent.name || 'Unknown Agent'}</p>
                                                <p className="text-xs text-gray-400">{agent.identityVerification?.idType || '—'} · {agent.phone || '—'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => verifyAgentIdentity(agent.id, true)}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-medium">
                                                    ✓ Approve
                                                </button>
                                                <button onClick={() => verifyAgentIdentity(agent.id, false)}
                                                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 font-medium">
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Navigation */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                            { label: 'All Orders',   icon: '🛒', tab: 'orders',   color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' },
                            { label: 'Riders',       icon: '🛵', tab: 'riders',   color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' },
                            { label: 'Vendors',      icon: '🏪', tab: 'vendors',  color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' },
                            { label: 'Payments',     icon: '💳', tab: 'payments', color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' },
                            { label: 'Live Map',     icon: '🗺️', tab: 'map',      color: 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200' },
                            { label: 'Customers',    icon: '👥', tab: 'customers',color: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' },
                        ].map((q, i) => (
                            <button key={i} onClick={() => setActiveTab(q.tab)}
                                className={`cursor-pointer ${q.color} rounded-xl p-4 text-center font-semibold text-sm transition-all border hover:shadow-md hover:scale-105`}>
                                <div className="text-3xl mb-1">{q.icon}</div>
                                {q.label}
                                <div className="text-xs opacity-60 mt-1">Open →</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active orders snapshot */}
                {activeOrders.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="font-semibold text-gray-800">🔴 Active Orders ({activeOrders.length})</span>
                            <button onClick={() => setActiveTab('orders')} className="text-xs text-red-500 hover:underline">Manage all orders →</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        {['Order', 'Customer', 'Vendor', 'Amount', 'Status', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {activeOrders.slice(0, 8).map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-gray-500">#{order.id?.slice(-6)}</td>
                                            <td className="px-4 py-2.5 font-medium text-gray-900">{order.customerName || order.userName || '—'}</td>
                                            <td className="px-4 py-2.5 text-gray-600">{order.vendorName || '—'}</td>
                                            <td className="px-4 py-2.5 font-semibold">₦{(order.totalAmount || order.total || 0).toLocaleString()}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    order.status === 'assigned' || order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>{order.status}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {order.status === 'pending' && !order.riderId && (
                                                    <select className="text-xs border rounded px-2 py-1"
                                                        onChange={e => e.target.value && assignRiderToOrder(order.id, e.target.value)}
                                                        defaultValue="">
                                                        <option value="">Assign rider…</option>
                                                        {getAvailableRiders().map(r => (
                                                            <option key={r.id} value={r.id}>{r.name || r.fullName}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {order.riderId && <span className="text-xs text-green-600 font-medium">Rider assigned ✓</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAnalyticsTab = () => {
        const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const toDate = (ts) => ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);

        // Revenue calculations across all order types
        const allRevOrders = [...orders, ...bookings, ...gobuyOrders];
        const totalRevenue = allRevOrders.reduce((s, o) => s + (o.totalAmount || o.total || o.amount || 0), 0);
        const todayRevenue = allRevOrders.filter(o => { const d = toDate(o.createdAt); return d && d >= todayStart; })
            .reduce((s, o) => s + (o.totalAmount || o.total || o.amount || 0), 0);
        const weekRevenue = allRevOrders.filter(o => { const d = toDate(o.createdAt); return d && d >= weekStart; })
            .reduce((s, o) => s + (o.totalAmount || o.total || o.amount || 0), 0);
        const monthRevenue = allRevOrders.filter(o => { const d = toDate(o.createdAt); return d && d >= monthStart; })
            .reduce((s, o) => s + (o.totalAmount || o.total || o.amount || 0), 0);

        // Order status breakdown
        const statusCount = orders.reduce((acc, o) => {
            const s = o.status || 'unknown';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        const delivered = (statusCount.delivered || 0) + (statusCount.completed || 0);
        const active = (statusCount.assigned || 0) + (statusCount.enroute || 0) + (statusCount.picked_up || 0) + (statusCount.preparing || 0);
        const pending = statusCount.pending || 0;
        const cancelled = statusCount.cancelled || 0;

        // Top vendors by order count
        const vendorOrderMap = {};
        orders.forEach(o => {
            const vn = o.vendorName || o.vendor?.name || 'Unknown';
            vendorOrderMap[vn] = (vendorOrderMap[vn] || 0) + 1;
        });
        const topVendors = Object.entries(vendorOrderMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Rider performance
        const riderOrderMap = {};
        orders.filter(o => o.riderId).forEach(o => {
            const r = riders.find(r => r.id === o.riderId);
            const name = r ? (r.name || r.fullName || 'Rider') : o.riderId?.slice(-6);
            riderOrderMap[name] = (riderOrderMap[name] || 0) + 1;
        });
        const topRiders = Object.entries(riderOrderMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Daily orders for last 7 days
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayStart); d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('en-NG', { weekday: 'short' });
            const count = allRevOrders.filter(o => {
                const od = toDate(o.createdAt);
                return od && od >= d && od < new Date(d.getTime() + 86400000);
            }).length;
            days.push({ label, count });
        }
        const maxDayCount = Math.max(...days.map(d => d.count), 1);

        // Summary cards
        const kpis = [
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: 'All time', color: 'bg-green-500' },
            { label: "Today's Revenue", value: fmt(todayRevenue), sub: 'Since midnight', color: 'bg-blue-500' },
            { label: 'This Week', value: fmt(weekRevenue), sub: 'Last 7 days', color: 'bg-purple-500' },
            { label: 'This Month', value: fmt(monthRevenue), sub: new Date().toLocaleString('en-NG', { month: 'long' }), color: 'bg-red-500' },
            { label: 'Total Orders', value: orders.length, sub: 'All food orders', color: 'bg-orange-500' },
            { label: 'Delivered', value: delivered, sub: `${orders.length ? Math.round(delivered / orders.length * 100) : 0}% completion`, color: 'bg-teal-500' },
            { label: 'Active Riders', value: riders.filter(r => r.status === 'online' || r.status === 'delivering').length, sub: `${riders.length} total`, color: 'bg-yellow-500' },
            { label: 'Active Vendors', value: vendors.filter(v => v.isActive !== false && v.status !== 'suspended').length, sub: `${vendors.length} total`, color: 'bg-indigo-500' },
        ];

        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">GO7 Business Analytics</h2>
                    <span className="text-xs text-gray-400">Live data — updates in real-time</span>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {kpis.map((k, i) => (
                        <div key={i} className="bg-white rounded-xl shadow p-4 border-l-4" style={{ borderColor: '' }}>
                            <div className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium mb-2 ${k.color}`}>{k.label}</div>
                            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                            <div className="text-xs text-gray-400 mt-1">{k.sub}</div>
                        </div>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Order Status Breakdown */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Order Status Breakdown</h3>
                        {[
                            { label: 'Delivered / Completed', count: delivered, color: 'bg-green-400' },
                            { label: 'Active (in progress)', count: active, color: 'bg-blue-400' },
                            { label: 'Pending', count: pending, color: 'bg-yellow-400' },
                            { label: 'Cancelled', count: cancelled, color: 'bg-red-400' },
                        ].map((s, i) => (
                            <div key={i} className="mb-3">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{s.label}</span>
                                    <span className="font-medium">{s.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${s.color}`}
                                        style={{ width: `${orders.length ? Math.round(s.count / Math.max(orders.length, 1) * 100) : 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 7-Day Order Volume Chart */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Orders — Last 7 Days</h3>
                        <div className="flex items-end gap-2 h-28">
                            {days.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs text-gray-500 font-medium">{d.count}</span>
                                    <div className="w-full bg-red-500 rounded-t transition-all"
                                        style={{ height: `${Math.round((d.count / maxDayCount) * 90)}px`, minHeight: d.count ? '4px' : '2px', opacity: 0.8 }} />
                                    <span className="text-xs text-gray-400">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Vendors */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Top Vendors by Orders</h3>
                        {topVendors.length === 0 ? (
                            <p className="text-sm text-gray-400">No order data yet</p>
                        ) : topVendors.map(([name, count], i) => (
                            <div key={i} className="flex items-center gap-3 mb-2">
                                <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-0.5">
                                        <span className="text-gray-700 truncate">{name}</span>
                                        <span className="font-medium ml-2">{count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-red-400"
                                            style={{ width: `${Math.round(count / topVendors[0][1] * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Top Riders */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Top Riders by Deliveries</h3>
                        {topRiders.length === 0 ? (
                            <p className="text-sm text-gray-400">No delivery data yet</p>
                        ) : topRiders.map(([name, count], i) => (
                            <div key={i} className="flex items-center gap-3 mb-2">
                                <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-0.5">
                                        <span className="text-gray-700 truncate">{name}</span>
                                        <span className="font-medium ml-2">{count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-blue-400"
                                            style={{ width: `${Math.round(count / topRiders[0][1] * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Service Mix */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Service Mix</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Food Orders', count: orders.length, icon: '🛒', color: 'text-red-600 bg-red-50' },
                            { label: 'Deliveries', count: bookings.length, icon: '📦', color: 'text-blue-600 bg-blue-50' },
                            { label: 'GoBuy', count: gobuyOrders.length, icon: '🛍️', color: 'text-purple-600 bg-purple-50' },
                        ].map((s, i) => (
                            <div key={i} className={`rounded-lg p-4 text-center ${s.color}`}>
                                <div className="text-2xl mb-1">{s.icon}</div>
                                <div className="text-2xl font-bold">{s.count}</div>
                                <div className="text-xs font-medium mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderNotificationsTab = () => (
        <WhatsAppNotificationsPage />
    );

    // ─── CUSTOMERS TAB ────────────────────────────────────────────────────────
    const renderCustomersTab = () => {
        const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);
        const filtered = customers.filter(c => {
            if (!customerSearch) return true;
            const s = customerSearch.toLowerCase();
            return (c.displayName || c.name || '').toLowerCase().includes(s) ||
                   (c.email || '').toLowerCase().includes(s) ||
                   (c.phone || '').includes(s);
        });
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Customer Management</h2>
                    <div className="flex gap-3 items-center">
                        <span className="text-sm text-gray-500">{customers.length} registered users</span>
                        <input
                            type="text"
                            placeholder="Search by name, email, phone..."
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm w-64"
                        />
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
                        <p className="text-red-100 text-sm">Total Customers</p>
                        <p className="text-3xl font-bold">{customers.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow border-l-4 border-green-500">
                        <p className="text-gray-500 text-sm">With Phone</p>
                        <p className="text-2xl font-bold text-gray-800">{customers.filter(c => c.phone).length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow border-l-4 border-blue-500">
                        <p className="text-gray-500 text-sm">Guest Users</p>
                        <p className="text-2xl font-bold text-gray-800">{customers.filter(c => c.isGuest).length}</p>
                    </div>
                </div>

                {/* Customers table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Customer', 'Email', 'Phone', 'Role', 'Joined', 'Orders'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>
                                ) : filtered.slice(0, 100).map(customer => {
                                    const orderCount = orders.filter(o => o.userId === customer.id || o.customerId === customer.id).length;
                                    const initials = (customer.displayName || customer.name || customer.email || 'U').charAt(0).toUpperCase();
                                    return (
                                        <tr key={customer.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                        {customer.photoURL
                                                            ? <img src={customer.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                            : initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-sm">{customer.displayName || customer.name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-400">{customer.id.slice(-8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{customer.email || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{customer.phone || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    customer.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                    customer.role === 'rider' ? 'bg-blue-100 text-blue-700' :
                                                    customer.role === 'vendor' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {customer.role || 'customer'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {customer.createdAt?.toDate
                                                    ? customer.createdAt.toDate().toLocaleDateString()
                                                    : customer.createdAt
                                                    ? new Date(customer.createdAt).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-700">{orderCount}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // ─── BOOKINGS TAB (delivery bookings) ─────────────────────────────────────
    const renderBookingsTab = () => {
        const fmt = (n) => `₦${(n || 0).toLocaleString()}`;
        const bookingStatusColor = (s) => getAdminStatusColor(s);
        const filtered = bookings.filter(b => {
            if (!bookingSearch) return true;
            const s = bookingSearch.toLowerCase();
            const asText = (v) => typeof v === 'string' ? v : (v?.name || v?.address || String(v || ''));
            return (b.trackingCode || b.id || '').toLowerCase().includes(s) ||
                   asText(b.senderName || b.sender?.name).toLowerCase().includes(s) ||
                   asText(b.recipientName || b.recipient?.name).toLowerCase().includes(s) ||
                   asText(b.pickup?.address || b.pickupAddress).toLowerCase().includes(s);
        });
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Delivery Bookings</h2>
                    <div className="flex gap-3 items-center">
                        <span className="text-sm text-gray-500">{bookings.length} total</span>
                        <input
                            type="text"
                            placeholder="Search by tracking, name, address..."
                            value={bookingSearch}
                            onChange={e => setBookingSearch(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm w-64"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Pending', count: bookings.filter(b => ['pending','PLACED','QUOTED','searching_rider'].includes(b.status)).length, color: 'border-yellow-500 text-yellow-600' },
                        { label: 'Assigned', count: bookings.filter(b => ['assigned','ASSIGNED'].includes(b.status)).length, color: 'border-blue-500 text-blue-600' },
                        { label: 'In Transit', count: bookings.filter(b => ['in_transit','IN_TRANSIT','picked_up','PICKED_UP'].includes(b.status)).length, color: 'border-orange-500 text-orange-600' },
                        { label: 'Delivered', count: bookings.filter(b => ['delivered','DELIVERED','COMPLETED'].includes(b.status)).length, color: 'border-green-500 text-green-600' },
                    ].map(s => (
                        <div key={s.label} className={`bg-white rounded-lg p-3 shadow border-l-4 ${s.color}`}>
                            <p className="text-gray-500 text-xs">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.count}</p>
                        </div>
                    ))}
                </div>

                {/* Bookings table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Tracking', 'Sender', 'Pickup → Dropoff', 'Fee', 'Status', 'Date', 'Rider', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No bookings found</td></tr>
                                ) : filtered.slice(0, 100).map(booking => {
                                    const rider = riders.find(r => r.id === booking.riderId);
                                    const fee = booking.fare || booking.deliveryFee || booking.payment?.total || 0;
                                    const ts = booking.createdAt?.toDate ? booking.createdAt.toDate() : booking.createdAt ? new Date(booking.createdAt) : null;
                                    return (
                                        <tr key={booking.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-red-600">
                                                {booking.trackingCode || booking.id.slice(-8)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <p className="font-medium text-gray-900">{booking.senderName || booking.sender?.name || booking.customerName || '—'}</p>
                                                <p className="text-xs text-gray-400">{booking.senderPhone || booking.sender?.phone || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                                                <p className="truncate">📍 {booking.pickupAddress || booking.pickup?.address || '—'}</p>
                                                <p className="truncate">🎯 {booking.dropoffAddress || booking.dropoff?.address || booking.recipientAddress || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmt(fee)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatusColor(booking.status)}`}>
                                                    {getAdminStatusLabel(booking.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{ts ? ts.toLocaleDateString() : '—'}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {booking.riderId ? (
                                                    <span className="text-green-600 font-medium">{rider?.name || booking.riderName || 'Assigned'}</span>
                                                ) : (
                                                    <span className="text-yellow-600">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1 min-w-[140px]">
                                                    {!booking.riderId && (
                                                        <select
                                                            className="text-xs border rounded px-1 py-1"
                                                            onChange={e => assignRiderToBooking(booking.id, e.target.value)}
                                                            defaultValue=""
                                                        >
                                                            <option value="">Assign rider…</option>
                                                            {getAvailableRiders().map(r => (
                                                                <option key={r.id} value={r.id}>{r.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {!['DELIVERED','COMPLETED','CANCELED'].includes(booking.status) && (
                                                        <select
                                                            className="text-xs border rounded px-1 py-1"
                                                            onChange={e => e.target.value && updateBookingStatus(booking.id, e.target.value)}
                                                            defaultValue=""
                                                        >
                                                            <option value="">Update status…</option>
                                                            {['QUOTED','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED','CANCELED'].map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // ─── GOBUY TAB ────────────────────────────────────────────────────────────
    const renderGobuyTab = () => {
        const fmt = (n) => `₦${(n || 0).toLocaleString()}`;
        const statusColors = {
            Pending:   'bg-yellow-100 text-yellow-700',
            Assigned:  'bg-blue-100 text-blue-700',
            Shopping:  'bg-indigo-100 text-indigo-700',
            Purchased: 'bg-purple-100 text-purple-700',
            InTransit: 'bg-orange-100 text-orange-700',
            Delivered: 'bg-green-100 text-green-700',
            Cancelled: 'bg-red-100 text-red-700',
        };
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">GoBuy Orders (Personal Shopping)</h2>
                    <span className="text-sm text-gray-500">{gobuyOrders.length} total</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Pending', count: gobuyOrders.filter(o => o.orderStatus === 'Pending').length, color: 'border-yellow-500 text-yellow-600' },
                        { label: 'Shopping', count: gobuyOrders.filter(o => ['Assigned','Shopping','Purchased'].includes(o.orderStatus)).length, color: 'border-blue-500 text-blue-600' },
                        { label: 'In Transit', count: gobuyOrders.filter(o => o.orderStatus === 'InTransit').length, color: 'border-orange-500 text-orange-600' },
                        { label: 'Delivered', count: gobuyOrders.filter(o => o.orderStatus === 'Delivered').length, color: 'border-green-500 text-green-600' },
                    ].map(s => (
                        <div key={s.label} className={`bg-white rounded-lg p-3 shadow border-l-4 ${s.color}`}>
                            <p className="text-gray-500 text-xs">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.count}</p>
                        </div>
                    ))}
                </div>

                {/* GoBuy orders table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Item', 'Customer', 'Budget', 'Total Paid', 'Status', 'Date', 'Rider', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {gobuyOrders.length === 0 ? (
                                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No GoBuy orders yet</td></tr>
                                ) : gobuyOrders.map(order => {
                                    const ts = order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt ? new Date(order.createdAt) : null;
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {order.itemName || 'Unknown item'}
                                                {order.specialInstructions && (
                                                    <p className="text-xs text-gray-400 truncate max-w-xs">{order.specialInstructions}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <p className="font-medium text-gray-900">{order.customerName || '—'}</p>
                                                <p className="text-xs text-gray-400 truncate">{order.customerAddress || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{fmt(order.itemBudget)}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmt(order.totalPaid)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.orderStatus || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{ts ? ts.toLocaleDateString() : '—'}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {order.assignedRider ? (
                                                    <span className="text-green-600 font-medium">{order.assignedRider}</span>
                                                ) : (
                                                    <span className="text-yellow-600">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1 min-w-[140px]">
                                                    {!order.assignedRiderId && (
                                                        <select
                                                            className="text-xs border rounded px-1 py-1"
                                                            onChange={e => assignRiderToGobuy(order.id, e.target.value)}
                                                            defaultValue=""
                                                        >
                                                            <option value="">Assign rider…</option>
                                                            {getAvailableRiders().map(r => (
                                                                <option key={r.id} value={r.id}>{r.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {!['Delivered','Cancelled'].includes(order.orderStatus) && (
                                                        <select
                                                            className="text-xs border rounded px-1 py-1"
                                                            onChange={e => e.target.value && updateGobuyStatus(order.id, e.target.value)}
                                                            defaultValue=""
                                                        >
                                                            <option value="">Update status…</option>
                                                            {['Assigned','Shopping','Purchased','InTransit','Delivered','Cancelled'].map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderMapTab = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Live Map</h2>
            <div 
                ref={mapRef} 
                className="w-full h-96 bg-gray-200 rounded-lg"
                style={{ minHeight: '400px' }}
            />
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading Go7 Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header with Stats */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">Go7 Admin Control Panel</h1>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400 hidden sm:block">Last updated: {new Date().toLocaleTimeString()}</span>
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                >
                                    ← App
                                </button>
                                <button
                                    onClick={async () => {
                                        await signOut(getAuth());
                                        navigate('/login');
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                        
                        {/* Stats Bar */}
                        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                            <div className="bg-gradient-to-r from-red-500 to-red-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">🛒</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-red-100 truncate">Active Orders</dt>
                                            <dd className="text-lg font-medium text-white">{stats.activeOrders}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-green-500 to-green-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">🛵</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-green-100 truncate">Online Riders</dt>
                                            <dd className="text-lg font-medium text-white">{stats.onlineRiders}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">💰</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-blue-100 truncate">Earnings</dt>
                                            <dd className="text-lg font-medium text-white">₦{stats.totalEarnings.toLocaleString()}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">🔄</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-yellow-100 truncate">Payouts</dt>
                                            <dd className="text-lg font-medium text-white">{stats.pendingPayouts}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">🤝</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-purple-100 truncate">Agents</dt>
                                            <dd className="text-lg font-medium text-white">{agentCount}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-pink-500 to-pink-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">👥</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-pink-100 truncate">Customers</dt>
                                            <dd className="text-lg font-medium text-white">{customers.length}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">📦</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-orange-100 truncate">Bookings</dt>
                                            <dd className="text-lg font-medium text-white">{bookings.length}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-teal-500 to-teal-600 overflow-hidden rounded-lg">
                                <div className="p-4">
                                    <div className="flex items-center">
                                        <div className="text-white text-xl mr-3">🛍️</div>
                                        <dl>
                                            <dt className="text-xs font-medium text-teal-100 truncate">GoBuy</dt>
                                            <dd className="text-lg font-medium text-white">{gobuyOrders.length}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-nowrap overflow-x-auto overflow-y-hidden gap-1 py-1 md:flex-wrap md:overflow-visible" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {[
                            { id: 'dispatch', label: `Dispatch${orders.filter(o=>o.status==='pending').length > 0 ? ` 🔴${orders.filter(o=>o.status==='pending').length}` : ''}`, icon: '🚀' },
                            { id: 'overview', label: 'Overview', icon: '⚡' },
                            { id: 'analytics', label: 'Analytics', icon: '📊' },
                            { id: 'orders', label: 'Orders', icon: '🛒' },
                            { id: 'bookings', label: `Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}`, icon: '📦' },
                            { id: 'gobuy', label: `GoBuy${gobuyOrders.length > 0 ? ` (${gobuyOrders.length})` : ''}`, icon: '🛍️' },
                            { id: 'customers', label: `Customers${customers.length > 0 ? ` (${customers.length})` : ''}`, icon: '👥' },
                            { id: 'riders', label: `Riders${(() => { const p = getMergedRidersList().filter(r => !r.approved || r.status === 'pending' || r.status === 'submitted' || r.status === 'incomplete' || r._fromUsersOnly || (r.status === 'offline' && r.approved !== true)); return p.length > 0 ? ` 🔴${p.length}` : ` (${getMergedRidersList().length})`; })()}`, icon: '🛵' },
                            { id: 'vendors', label: 'Vendors', icon: '🏪' },
                            { id: 'payments', label: 'Payments', icon: '💳' },
                            { id: 'pricing', label: 'Pricing', icon: '💰' },
                            { id: 'promos', label: 'Promo Banners', icon: '🎯' },
                            { id: 'growth', label: 'Growth', icon: '📣' },
                            { id: 'agents', label: `Agents${agentCount > 0 ? ` (${agentCount})` : ''}`, icon: '🤝' },
                            { id: 'support', label: `Support${supportTickets.filter(t => t.status === 'open').length > 0 ? ` (${supportTickets.filter(t => t.status === 'open').length})` : ''}`, icon: '💬' },
                            { id: 'notifications', label: 'WhatsApp', icon: '📱' },
                            { id: 'fcm', label: 'Push Notifs', icon: '🔔' },
                            { id: 'map', label: 'Live Map', icon: '🗺️' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    const path = TAB_TO_PATH[tab.id];
                                    if (path && location.pathname !== path) {
                                        navigate(path);
                                    }
                                }}
                                className={`flex-shrink-0 py-3 px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-red-500 text-red-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'dispatch' && renderDispatchTab()}
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'analytics' && renderAnalyticsTab()}
                {activeTab === 'orders' && renderOrdersTab()}
                {activeTab === 'bookings' && renderBookingsTab()}
                {activeTab === 'gobuy' && renderGobuyTab()}
                {activeTab === 'customers' && renderCustomersTab()}
                {activeTab === 'riders' && renderRidersTab()}
                {activeTab === 'vendors' && renderVendorsTab()}
                {activeTab === 'agents' && (
                    <div className="space-y-8">
                        {/* Identity verification queue */}
                        {agentsList.filter(a => a.identityVerification && !a.identityVerification.verified && a.identityVerification.status !== 'rejected').length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Agent Identity Verification</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {agentsList.filter(a => a.identityVerification && !a.identityVerification.verified && a.identityVerification.status !== 'rejected').map(agent => (
                                        <div key={agent.id} className="bg-white rounded-lg shadow border-l-4 border-orange-400 p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{agent.name || 'Unknown Agent'}</p>
                                                    <p className="text-sm text-gray-500">{agent.phone || '—'}</p>
                                                    <p className="text-xs text-gray-400">Submitted: {agent.identityVerification.submittedAt ? new Date(agent.identityVerification.submittedAt).toLocaleDateString() : '—'}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Pending Review</span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1 mb-4">
                                                <p><span className="font-medium">ID Type:</span> {agent.identityVerification.idType || '—'}</p>
                                                <p><span className="font-medium">ID Number:</span> {agent.identityVerification.idNumber || '—'}</p>
                                                {agent.identityVerification.idFileURL && (
                                                    <a href={agent.identityVerification.idFileURL} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-1">
                                                        📄 View ID Document
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => verifyAgentIdentity(agent.id, true)}
                                                    className="flex-1 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 font-medium">
                                                    ✓ Approve ID
                                                </button>
                                                <button onClick={() => verifyAgentIdentity(agent.id, false)}
                                                    className="flex-1 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 font-medium">
                                                    ✗ Reject ID
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Earnings & withdrawals */}
                        <AdminEarningsPanel />
                        <PlatformRevenuePanel />
                    </div>
                )}
                {activeTab === 'support' && renderSupportTab()}
                {activeTab === 'payments' && renderPaymentsTab()}
                {activeTab === 'pricing' && (
                    <div className="space-y-8">
                        <PricingSettingsPanel />
                        <DeliveryZonesPanel />
                        <BillsPricingPanel />
                    </div>
                )}
                {activeTab === 'promos' && <PromoBannerPanel />}
                {activeTab === 'growth' && <GrowthPanel />}
                {activeTab === 'notifications' && renderNotificationsTab()}
                {activeTab === 'map' && renderMapTab()}
            </div>

            {/* Rider Full Profile Modal */}
            {selectedRider && (() => {
                const r = selectedRider;
                const reg = r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt ? new Date(r.createdAt) : null;
                // Fields to skip from the "other fields" dump (already shown explicitly)
                const SKIP = new Set(['id','name','fullName','phone','email','vehicle','vehicleType','fleetType','plateNumber','vehicleNumber','licenseNumber','driversLicense','status','approved','createdAt','updatedAt','profilePhoto','photoURL','idCard','idDocument','idDocumentURL','idFileURL','licensePhotoURL','vehiclePhotoURL','bankName','accountNumber','accountName','bankCode','bankDetails','address','currentLocation','currentOrderId','rating','totalDeliveries','totalEarnings','uid','applicationStatus','resubmittedAt','reuploadRequestedAt','reuploadRequestedBy']);
                const collectUrls = (obj, prefix = '') => {
                    const out = [];
                    if (!obj || typeof obj !== 'object') return out;
                    for (const [k, v] of Object.entries(obj)) {
                        const label = prefix ? `${prefix}.${k}` : k;
                        if (typeof v === 'string' && (v.startsWith('http') || v.includes('firebasestorage'))) {
                            out.push({ label, url: v });
                        } else if (v && typeof v === 'object' && !v.toDate && v.latitude === undefined) {
                            out.push(...collectUrls(v, label));
                        }
                    }
                    return out;
                };
                const uploads = collectUrls(r);
                const extra = Object.entries(r).filter(([k]) => !SKIP.has(k) && k !== 'identityVerification');
                const Field = ({ label, val }) => val ? (
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
                        <span className="text-xs text-gray-900 font-medium text-right break-all">{String(val)}</span>
                    </div>
                ) : null;
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-8 px-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-xl p-5 text-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        {r.profilePhoto || r.photoURL
                                            ? <img src={r.profilePhoto || r.photoURL} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white" />
                                            : <div className="w-14 h-14 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold">{(r.name || r.fullName || 'R').charAt(0).toUpperCase()}</div>
                                        }
                                        <div>
                                            <h3 className="text-lg font-bold">{r.name || r.fullName || 'Unnamed Rider'}</h3>
                                            <p className="text-red-100 text-sm">{r.phone || r.email || '—'}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${r.status === 'active' || r.status === 'online' ? 'bg-green-400 text-white' : r.status === 'delivering' ? 'bg-yellow-300 text-yellow-900' : r.status === 'suspended' ? 'bg-red-900 text-white' : 'bg-white bg-opacity-30 text-white'}`}>
                                                {r.status || 'offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedRider(null)} className="text-white text-xl opacity-70 hover:opacity-100">✕</button>
                                </div>
                                {/* Quick actions in header */}
                                <div className="flex gap-2 mt-3">
                                    {(!r.approved || r.status === 'pending') && (
                                        <button onClick={() => { approveRider(r.id, r.name || r.fullName || 'Rider'); setSelectedRider(null); }}
                                            className="px-3 py-1 bg-green-400 text-white text-xs rounded-lg font-semibold hover:bg-green-500">
                                            ✓ Approve Rider
                                        </button>
                                    )}
                                    {r.approved && r.status !== 'suspended' && (
                                        <button onClick={() => { suspendRider(r.id, r.name || r.fullName || 'Rider'); setSelectedRider(null); }}
                                            className="px-3 py-1 bg-red-800 text-white text-xs rounded-lg font-semibold hover:bg-red-900">
                                            Suspend
                                        </button>
                                    )}
                                    {r.status === 'suspended' && (
                                        <button onClick={() => { approveRider(r.id, r.name || r.fullName || 'Rider'); setSelectedRider(null); }}
                                            className="px-3 py-1 bg-green-400 text-white text-xs rounded-lg font-semibold hover:bg-green-500">
                                            Reinstate
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                                {r._fromUsersOnly && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                        This rider signed up but their full profile was not saved to the <code className="text-xs">riders</code> collection (Firestore rules previously blocked rider self-registration). Only login/account data may exist. You can still approve to create their rider profile from what is available.
                                    </div>
                                )}

                                {/* Identity & Contact */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Identity & Contact</p>
                                    <Field label="Full Name" val={r.name || r.fullName} />
                                    <Field label="Phone" val={r.phone} />
                                    <Field label="Email" val={r.email} />
                                    <Field label="Address" val={r.address} />
                                    <Field label="Registered" val={reg ? reg.toLocaleString() : null} />
                                    <Field label="Approved" val={r.approved ? 'Yes' : 'No'} />
                                </div>

                                {/* Vehicle */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vehicle</p>
                                    <div className="flex flex-wrap gap-2 items-center mb-2">
                                        <select
                                            value={riderFleetEdit}
                                            onChange={(e) => setRiderFleetEdit(e.target.value)}
                                            className="flex-1 min-w-[180px] px-2 py-1.5 border rounded-lg text-xs"
                                        >
                                            {FLEET_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => saveRiderFleetType(r.id)}
                                            className="cursor-pointer px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-900"
                                        >
                                            Save vehicle
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Showing: <strong>{formatFleetLabel(r)}</strong>
                                        {(r.vehicle || r.vehicleType || r.fleetType) && (
                                            <span className="text-gray-400"> (stored: {r.fleetType || '—'} / {r.vehicleType || r.vehicle || '—'})</span>
                                        )}
                                    </p>
                                    <Field label="Plate Number" val={r.plateNumber || r.vehicleNumber} />
                                    <Field label="License Number" val={r.licenseNumber || r.driversLicense} />
                                </div>

                                {/* ID Documents */}
                                {(r.idCard || r.idDocument || r.idDocumentURL || r.idFileURL || r.identityVerification) && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">ID Documents</p>
                                        {r.identityVerification && (
                                            <>
                                                <Field label="ID Type" val={r.identityVerification.idType} />
                                                <Field label="ID Number" val={r.identityVerification.idNumber} />
                                                <Field label="Verification Status" val={r.identityVerification.status || (r.identityVerification.verified ? 'Verified' : 'Pending')} />
                                            </>
                                        )}
                                        {(r.idCard || r.idDocument || r.idDocumentURL || r.idFileURL || r.identityVerification?.idFileURL) && (
                                            <div className="mt-2">
                                                <a href={r.idCard || r.idDocument || r.idDocumentURL || r.idFileURL || r.identityVerification?.idFileURL}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">
                                                    📄 View ID Document
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bank Details */}
                                {(r.bankName || r.accountNumber || r.bankDetails) && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Bank Details</p>
                                        <Field label="Bank Name" val={r.bankName || r.bankDetails?.bankName} />
                                        <Field label="Account Number" val={r.accountNumber || r.bankDetails?.accountNumber} />
                                        <Field label="Account Name" val={r.accountName || r.bankDetails?.accountName} />
                                    </div>
                                )}

                                {/* Performance */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Performance</p>
                                    <Field label="Total Deliveries" val={r.totalDeliveries} />
                                    <Field label="Rating" val={r.rating ? `${r.rating} ★` : null} />
                                    <Field label="Total Earnings" val={r.totalEarnings ? `₦${Number(r.totalEarnings).toLocaleString()}` : null} />
                                    {r.currentOrderId && <Field label="Current Order" val={`#${r.currentOrderId.slice(-8)}`} />}
                                    {r.currentLocation && <Field label="Last Location" val={`${r.currentLocation.latitude?.toFixed(5)}, ${r.currentLocation.longitude?.toFixed(5)}`} />}
                                </div>

                                {/* Uploaded files & photos from rider app */}
                                {uploads.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Uploaded Files &amp; Photos ({uploads.length})</p>
                                        <div className="space-y-3">
                                            {uploads.map(({ label, url }) => (
                                                <div key={label + url} className="border border-gray-200 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
                                                    {/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) ? (
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                            <img src={url} alt={label} className="max-h-40 rounded border object-contain bg-gray-50" />
                                                        </a>
                                                    ) : null}
                                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex mt-2 items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
                                                        Open file →
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All other fields (catches anything from rider app we haven't hardcoded) */}
                                {extra.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Other Profile Data</p>
                                        {extra.map(([k, v]) => (
                                            <Field key={k} label={k} val={typeof v === 'object' ? JSON.stringify(v) : v} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="px-5 pb-5 flex flex-wrap gap-2 border-t pt-4">
                                    {(!r.approved || r.status === 'pending' || r.status === 'offline' || r.status === 'submitted' || r._fromUsersOnly) && r.status !== 'rejected' && (
                                    <>
                                        <button type="button" onClick={() => approveRider(r.id, r.name || r.fullName || 'Rider')}
                                            className="flex-1 min-w-[140px] cursor-pointer py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                                            ✓ Approve Rider
                                        </button>
                                        <button type="button" onClick={() => rejectRider(r.id, r.name || r.fullName || 'Rider')}
                                            className="flex-1 min-w-[100px] cursor-pointer py-3 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 border border-red-200">
                                            ✗ Reject
                                        </button>
                                        <button type="button" onClick={() => requestRiderReupload(r)}
                                            className="flex-1 min-w-[120px] cursor-pointer py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                                            ✉ Re-upload Email
                                        </button>
                                    </>
                                )}
                                <button type="button" onClick={() => setSelectedRider(null)}
                                    className="flex-1 min-w-[100px] py-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AdminDashboard;