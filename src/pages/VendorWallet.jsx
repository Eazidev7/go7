import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { doc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { requestVendorWithdrawal } from '../utils/vendorWalletUtils';
import { VENDOR_MIN_WITHDRAWAL } from '../constants/vendorCommission';
import Swal from 'sweetalert2';
import {
    FiDollarSign,
    FiTrendingUp,
    FiClock,
    FiCheck,
    FiX,
    FiRefreshCw,
    FiEye,
    FiDownload,
    FiCreditCard,
    FiZap,
} from 'react-icons/fi';

const STATUS_LABELS = {
    pending: 'Queued',
    processing: 'Sending…',
    paid: 'Sent ✓',
    failed: 'Failed',
    rejected: 'Rejected',
};

const VendorWallet = () => {
    const { currentUser } = useAuthContext();
    const [walletData, setWalletData] = useState({
        totalEarnings: 0,
        availableBalance: 0,
        pendingPayout: 0,
        totalPaidOut: 0,
    });
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [showPayoutForm, setShowPayoutForm] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const payoutStatusRef = useRef({});

    useEffect(() => {
        if (!currentUser) return undefined;

        const vendorId = currentUser.uid;

        const unsubscribeVendor = onSnapshot(doc(db, 'vendors', vendorId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setWalletData({
                    totalEarnings: data.totalEarnings || 0,
                    availableBalance: data.availableBalance ?? data.pendingBalance ?? 0,
                    pendingPayout: data.pendingPayout ?? data.pendingPayouts ?? 0,
                    totalPaidOut: data.totalPaidOut ?? data.totalPayouts ?? data.withdrawnBalance ?? 0,
                });
            }
            setLoading(false);
        });

        const payoutQuery = query(
            collection(db, 'payoutRequests'),
            where('vendorId', '==', vendorId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribePayouts = onSnapshot(payoutQuery, (snapshot) => {
            const payouts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

            payouts.forEach((payout) => {
                const prev = payoutStatusRef.current[payout.id];
                const next = payout.status;
                if (prev && prev !== next) {
                    if (next === 'paid') {
                        Swal.fire({
                            title: 'Money sent! ✅',
                            html: `<p><strong>₦${Number(payout.amount).toLocaleString()}</strong> has been sent to your bank.</p>`,
                            icon: 'success',
                            confirmButtonColor: '#ef4444',
                        });
                    } else if (next === 'failed') {
                        Swal.fire({
                            title: 'Payout failed',
                            text: payout.failureReason || 'Transfer failed. Your balance has been restored.',
                            icon: 'error',
                            confirmButtonColor: '#ef4444',
                        });
                    }
                }
                payoutStatusRef.current[payout.id] = next;
            });

            setPayoutHistory(payouts);
        });

        return () => {
            unsubscribeVendor();
            unsubscribePayouts();
        };
    }, [currentUser]);

    const activePayout = payoutHistory.find((p) => ['pending', 'processing'].includes(p.status));

    const handlePayoutRequest = async () => {
        const amount = parseFloat(payoutAmount);
        if (!currentUser?.uid || !amount || amount <= 0) {
            Swal.fire({ title: 'Invalid Amount', text: 'Please enter a valid payout amount.', icon: 'error' });
            return;
        }

        if (amount < VENDOR_MIN_WITHDRAWAL) {
            Swal.fire({
                title: 'Minimum Payout',
                text: `Minimum withdrawal is ₦${VENDOR_MIN_WITHDRAWAL.toLocaleString()}.`,
                icon: 'warning',
            });
            return;
        }

        if (amount > walletData.availableBalance) {
            Swal.fire({ title: 'Insufficient Balance', text: 'Amount exceeds available balance.', icon: 'error' });
            return;
        }

        const result = await Swal.fire({
            title: 'Withdraw to bank',
            html: `<p>Send <strong>₦${amount.toLocaleString()}</strong> instantly?</p>
              <p class="text-sm text-gray-600 mt-2">Usually arrives in 1–5 minutes via Paystack.</p>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, send now',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
        });

        if (!result.isConfirmed) return;

        setWithdrawing(true);
        try {
            const reference = await requestVendorWithdrawal(currentUser.uid, amount);
            setPayoutAmount('');
            setShowPayoutForm(false);
            Swal.fire({
                title: 'Sending to your bank…',
                html: `<p>Transferring <strong>₦${amount.toLocaleString()}</strong> now.</p>
                  <p class="text-sm text-gray-600 mt-2">Ref: ${reference}</p>`,
                icon: 'info',
                timer: 4000,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Error requesting payout:', error);
            Swal.fire({
                title: 'Withdrawal Failed',
                text: error.message || 'Failed to submit payout. Please try again.',
                icon: 'error',
            });
        } finally {
            setWithdrawing(false);
        }
    };

    const refreshWalletData = async () => {
        setRefreshing(true);
        await new Promise((resolve) => setTimeout(resolve, 600));
        setRefreshing(false);
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            approved: 'bg-blue-100 text-blue-800',
            paid: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: <FiClock className="w-4 h-4" />,
            processing: <FiRefreshCw className="w-4 h-4 animate-spin" />,
            approved: <FiCheck className="w-4 h-4" />,
            paid: <FiCheck className="w-4 h-4" />,
            failed: <FiX className="w-4 h-4" />,
            rejected: <FiX className="w-4 h-4" />,
        };
        return icons[status] || <FiClock className="w-4 h-4" />;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading wallet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Vendor Wallet</h1>
                            <p className="text-gray-600 flex items-center gap-2 mt-1">
                                <FiZap className="text-red-500" />
                                Instant bank payouts via Paystack
                            </p>
                        </div>
                        <button
                            onClick={refreshWalletData}
                            disabled={refreshing}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activePayout && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                        <FiRefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-blue-900">
                                Sending ₦{Number(activePayout.amount).toLocaleString()} to your bank…
                            </p>
                            <p className="text-sm text-blue-700">Usually 1–5 minutes · Ref: {activePayout.reference || activePayout.id.slice(0, 8)}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">Total Earnings</p>
                                <p className="text-2xl font-bold">₦{walletData.totalEarnings.toLocaleString()}</p>
                            </div>
                            <FiTrendingUp className="w-8 h-8 text-green-200" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Available Balance</p>
                                <p className="text-2xl font-bold">₦{walletData.availableBalance.toLocaleString()}</p>
                            </div>
                            <FiDollarSign className="w-8 h-8 text-blue-200" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-yellow-100 text-sm font-medium">In Transit</p>
                                <p className="text-2xl font-bold">₦{walletData.pendingPayout.toLocaleString()}</p>
                            </div>
                            <FiClock className="w-8 h-8 text-yellow-200" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-100 text-sm font-medium">Total Paid Out</p>
                                <p className="text-2xl font-bold">₦{walletData.totalPaidOut.toLocaleString()}</p>
                            </div>
                            <FiDownload className="w-8 h-8 text-red-200" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Withdraw to Bank</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Min ₦{VENDOR_MIN_WITHDRAWAL.toLocaleString()} · Instant transfer, usually 1–5 minutes
                            </p>
                        </div>
                        {!showPayoutForm && (
                            <button
                                onClick={() => setShowPayoutForm(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                <FiZap className="w-4 h-4" />
                                <span>Withdraw Instantly</span>
                            </button>
                        )}
                    </div>

                    {showPayoutForm && (
                        <div className="bg-gray-50 rounded-lg p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
                                    <input
                                        type="number"
                                        value={payoutAmount}
                                        onChange={(e) => setPayoutAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        min={VENDOR_MIN_WITHDRAWAL}
                                        max={walletData.availableBalance}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Min: ₦{VENDOR_MIN_WITHDRAWAL.toLocaleString()} · Available: ₦{walletData.availableBalance.toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex items-end space-x-3">
                                    <button
                                        onClick={handlePayoutRequest}
                                        disabled={withdrawing || !payoutAmount || parseFloat(payoutAmount) <= 0}
                                        className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {withdrawing ? 'Sending…' : 'Send to Bank'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPayoutForm(false);
                                            setPayoutAmount('');
                                        }}
                                        className="py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
                    </div>

                    <div className="overflow-x-auto">
                        {payoutHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <FiCreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No payouts yet</p>
                            </div>
                        ) : (
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payoutHistory.map((payout) => (
                                        <tr key={payout.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {payout.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ₦{payout.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                                                    {getStatusIcon(payout.status)}
                                                    <span>{STATUS_LABELS[payout.status] || payout.status}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                                                {payout.reference || payout.paystackReference || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => {
                                                        Swal.fire({
                                                            title: 'Payout Details',
                                                            html: `
                                                                <div class="text-left text-sm">
                                                                    <p><strong>Amount:</strong> ₦${payout.amount?.toLocaleString()}</p>
                                                                    <p><strong>Status:</strong> ${STATUS_LABELS[payout.status] || payout.status}</p>
                                                                    <p><strong>Reference:</strong> ${payout.reference || '—'}</p>
                                                                    ${payout.paystackReference ? `<p><strong>Paystack:</strong> ${payout.paystackReference}</p>` : ''}
                                                                    ${payout.failureReason ? `<p class="text-red-600"><strong>Error:</strong> ${payout.failureReason}</p>` : ''}
                                                                </div>
                                                            `,
                                                            icon: 'info',
                                                        });
                                                    }}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorWallet;
