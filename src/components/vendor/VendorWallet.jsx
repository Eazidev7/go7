// 🚀 GO7 VENDOR WALLET COMPONENT — instant Paystack payouts

import React, { useState, useEffect, useRef } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import { db } from "../../config/firebase";
import { doc, collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getVendorWallet, requestVendorWithdrawal } from "../../utils/vendorWalletUtils";
import { VENDOR_COMMISSION_PERCENT, VENDOR_MIN_WITHDRAWAL } from "../../constants/vendorCommission";
import VendorBankDetailsForm from "./VendorBankDetailsForm";
import { getBankLabel } from "../../constants/nigerianBanks";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Download,
  Clock,
  CheckCircle,
  Loader2,
  XCircle,
  Zap,
} from "lucide-react";
import Swal from "sweetalert2";
import "./VendorWallet.css";

const PAYOUT_STATUS_LABELS = {
  pending: { label: "Queued", className: "payout-status-pending" },
  processing: { label: "Sending to bank…", className: "payout-status-processing" },
  paid: { label: "Sent ✓", className: "payout-status-paid" },
  failed: { label: "Failed", className: "payout-status-failed" },
  rejected: { label: "Rejected", className: "payout-status-failed" },
};

function formatPayoutDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VendorWallet() {
  const { user } = useAuthContext();
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [showBankForm, setShowBankForm] = useState(false);
  const payoutStatusRef = useRef({});

  useEffect(() => {
    if (!user) return;

    const vendorRef = doc(db, "vendors", user.uid);
    const unsubscribeVendor = onSnapshot(
      vendorRef,
      (snap) => {
        if (!snap.exists()) return;
        const vendor = snap.data();
        const available = vendor.availableBalance ?? vendor.pendingBalance ?? 0;
        setWalletData({
          totalEarnings: vendor.totalEarnings ?? 0,
          availableBalance: available,
          pendingBalance: available,
          pendingPayout: vendor.pendingPayout ?? vendor.pendingPayouts ?? 0,
          totalPaidOut: vendor.totalPaidOut ?? vendor.withdrawnBalance ?? 0,
          withdrawnBalance: vendor.totalPaidOut ?? vendor.withdrawnBalance ?? 0,
          bankDetails: vendor.bankDetails ?? null,
          lastWithdrawalDate: vendor.lastWithdrawalDate ?? null,
          lastWithdrawalAmount: vendor.lastWithdrawalAmount ?? 0,
        });
        setLoading(false);
      },
      (error) => {
        console.error("Vendor wallet listener error:", error);
        getVendorWallet(user.uid)
          .then(setWalletData)
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    );

    const transactionsQuery = query(
      collection(db, "vendorTransactions"),
      where("vendorId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const unsubscribeTx = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const payoutsQuery = query(
      collection(db, "payoutRequests"),
      where("vendorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(8)
    );

    const unsubscribePayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      rows.forEach((payout) => {
        const prev = payoutStatusRef.current[payout.id];
        const next = payout.status;
        if (prev && prev !== next) {
          if (next === "paid") {
            Swal.fire({
              icon: "success",
              title: "Money sent! ✅",
              html: `<p><strong>₦${Number(payout.amount).toLocaleString()}</strong> has been sent to your bank.</p>
                <p class="text-sm text-gray-600 mt-2">Ref: ${payout.reference || payout.paystackReference || "—"}</p>`,
              confirmButtonColor: "#e0001b",
            });
          } else if (next === "failed") {
            Swal.fire({
              icon: "error",
              title: "Payout failed",
              text:
                payout.failureReason ||
                "Transfer could not be completed. Your balance has been restored.",
              confirmButtonColor: "#e0001b",
            });
          }
        }
        payoutStatusRef.current[payout.id] = next;
      });

      setPayouts(rows);
    });

    return () => {
      unsubscribeVendor();
      unsubscribeTx();
      unsubscribePayouts();
    };
  }, [user]);

  const activePayout = payouts.find((p) => ["pending", "processing"].includes(p.status));
  const lastPaidPayout = payouts.find((p) => p.status === "paid");

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid Amount",
        text: "Please enter a valid withdrawal amount",
        confirmButtonColor: "#e0001b",
      });
      return;
    }

    if (amount < VENDOR_MIN_WITHDRAWAL) {
      Swal.fire({
        icon: "warning",
        title: "Minimum Amount",
        text: `Minimum withdrawal amount is ₦${VENDOR_MIN_WITHDRAWAL.toLocaleString()}`,
        confirmButtonColor: "#e0001b",
      });
      return;
    }

    const available = walletData?.availableBalance ?? walletData?.pendingBalance ?? 0;

    if (amount > available) {
      Swal.fire({
        icon: "error",
        title: "Insufficient Balance",
        text: `Your available balance is ₦${available.toLocaleString()}`,
        confirmButtonColor: "#e0001b",
      });
      return;
    }

    const bank = walletData?.bankDetails;
    if (!bank?.accountNumber || !bank?.bankName || !bank?.accountName) {
      Swal.fire({
        icon: "warning",
        title: "Bank details required",
        text: "Add your bank account below before withdrawing.",
        confirmButtonColor: "#e0001b",
      });
      setShowBankForm(true);
      return;
    }

    const result = await Swal.fire({
      title: "Withdraw to bank",
      html: `
        <p>Send <strong>₦${amount.toLocaleString()}</strong> to your bank account?</p>
        <p class="text-sm text-gray-600 mt-2">
          <strong>Instant payout</strong> — usually arrives in 1–5 minutes via Paystack.
        </p>
        <p class="text-sm text-gray-500 mt-1">${getBankLabel(bank.bankCode, bank.bankName)} · ${bank.accountName}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e0001b",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, send now",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setWithdrawing(true);

    try {
      const reference = await requestVendorWithdrawal(user.uid, amount);
      setWithdrawalAmount("");

      Swal.fire({
        icon: "info",
        title: "Sending to your bank…",
        html: `
          <p>We're transferring <strong>₦${amount.toLocaleString()}</strong> now.</p>
          <p class="text-sm text-gray-600 mt-2">Ref: ${reference}</p>
          <p class="text-sm text-gray-600">This page will update automatically when it lands.</p>
        `,
        confirmButtonColor: "#e0001b",
        timer: 5000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Withdrawal error:", error);
      Swal.fire({
        icon: "error",
        title: "Withdrawal Failed",
        text: error.message || "Failed to process withdrawal. Please try again.",
        confirmButtonColor: "#e0001b",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPayoutStatusIcon = (status) => {
    if (status === "paid") return <CheckCircle size={16} />;
    if (status === "processing" || status === "pending") return <Loader2 size={16} className="spin-icon" />;
    if (status === "failed" || status === "rejected") return <XCircle size={16} />;
    return <Clock size={16} />;
  };

  if (loading) {
    return (
      <div className="vendor-wallet-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-wallet-container">
      <div className="wallet-header">
        <h1>
          <Wallet size={28} />
          Vendor Wallet
        </h1>
        <p className="wallet-instant-badge">
          <Zap size={14} />
          Instant bank payouts via Paystack
        </p>
      </div>

      {activePayout && (
        <div className="payout-live-banner">
          <Loader2 size={20} className="spin-icon" />
          <div>
            <strong>Sending ₦{Number(activePayout.amount).toLocaleString()} to your bank…</strong>
            <p>Ref: {activePayout.reference || activePayout.id.slice(0, 8)} · Usually 1–5 minutes</p>
          </div>
        </div>
      )}

      <div className="wallet-cards">
        <div className="wallet-card total-earnings">
          <div className="card-icon">
            <TrendingUp size={24} />
          </div>
          <div className="card-content">
            <p className="card-label">Total Earnings</p>
            <h2 className="card-amount">₦{walletData?.totalEarnings?.toLocaleString() || "0"}</h2>
            <p className="card-note">All-time revenue</p>
          </div>
        </div>

        <div className="wallet-card pending-balance">
          <div className="card-icon">
            <DollarSign size={24} />
          </div>
          <div className="card-content">
            <p className="card-label">Available Balance</p>
            <h2 className="card-amount">
              ₦{(walletData?.availableBalance ?? walletData?.pendingBalance ?? 0).toLocaleString()}
            </h2>
            <p className="card-note">Ready to withdraw instantly</p>
          </div>
        </div>

        <div className="wallet-card withdrawn">
          <div className="card-icon">
            <Download size={24} />
          </div>
          <div className="card-content">
            <p className="card-label">Paid Out</p>
            <h2 className="card-amount">
              ₦{(walletData?.totalPaidOut ?? walletData?.withdrawnBalance ?? 0).toLocaleString()}
            </h2>
            <p className="card-note">
              {(walletData?.pendingPayout ?? 0) > 0
                ? `₦${walletData.pendingPayout.toLocaleString()} in transit`
                : lastPaidPayout
                  ? `Last paid ${formatPayoutDate(lastPaidPayout.processedAt || lastPaidPayout.createdAt)}`
                  : "Total sent to your bank"}
            </p>
          </div>
        </div>
      </div>

      <div className="withdrawal-section">
        <h3>Withdraw to Bank</h3>
        <p className="withdrawal-note">
          Minimum ₦{VENDOR_MIN_WITHDRAWAL.toLocaleString()} · Instant transfer, usually 1–5 minutes
        </p>

        <div className="withdrawal-form">
          <div className="input-group">
            <label>Amount (₦)</label>
            <input
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder="Enter amount"
              min={VENDOR_MIN_WITHDRAWAL}
              step="1000"
              disabled={withdrawing || !(walletData?.availableBalance ?? walletData?.pendingBalance)}
            />
            <button
              className="max-btn"
              onClick={() =>
                setWithdrawalAmount(
                  String(walletData?.availableBalance ?? walletData?.pendingBalance ?? "")
                )
              }
              disabled={withdrawing || !(walletData?.availableBalance ?? walletData?.pendingBalance)}
            >
              Max
            </button>
          </div>

          <button
            className="withdraw-btn"
            onClick={handleWithdrawal}
            disabled={withdrawing || !(walletData?.availableBalance ?? walletData?.pendingBalance)}
          >
            {withdrawing ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                Sending…
              </>
            ) : (
              <>
                <Zap size={18} />
                Withdraw Instantly
              </>
            )}
          </button>
        </div>

        {walletData?.bankDetails && !showBankForm ? (
          <div className="bank-info">
            <p className="bank-label">Payout Account:</p>
            <p className="bank-details">
              {getBankLabel(walletData.bankDetails.bankCode, walletData.bankDetails.bankName)} —{" "}
              {walletData.bankDetails.accountName}
            </p>
            <p className="bank-details text-sm">
              ****{String(walletData.bankDetails.accountNumber || "").slice(-4)}
            </p>
            <button
              type="button"
              onClick={() => setShowBankForm(true)}
              className="text-sm text-red-600 hover:underline mt-2"
            >
              Update bank details
            </button>
          </div>
        ) : (
          <div className="bank-info mt-4">
            <VendorBankDetailsForm
              vendorId={user?.uid}
              initialDetails={walletData?.bankDetails}
              compact
              onSaved={(details) => {
                setWalletData((prev) => ({ ...prev, bankDetails: details }));
                setShowBankForm(false);
              }}
            />
          </div>
        )}
      </div>

      {payouts.length > 0 && (
        <div className="payouts-section">
          <h3>Recent Payouts</h3>
          <div className="payouts-list">
            {payouts.map((payout) => {
              const meta = PAYOUT_STATUS_LABELS[payout.status] || PAYOUT_STATUS_LABELS.pending;
              return (
                <div key={payout.id} className={`payout-item ${meta.className}`}>
                  <div className="payout-item-icon">{renderPayoutStatusIcon(payout.status)}</div>
                  <div className="payout-item-details">
                    <p className="payout-item-amount">₦{Number(payout.amount).toLocaleString()}</p>
                    <p className="payout-item-meta">
                      {formatPayoutDate(payout.createdAt || payout.requestedAt)}
                      {payout.reference ? ` · ${payout.reference}` : ""}
                    </p>
                    {payout.failureReason && (
                      <p className="payout-item-error">{payout.failureReason}</p>
                    )}
                  </div>
                  <span className={`payout-status-chip ${meta.className}`}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="transactions-section">
        <h3>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className="no-transactions">
            <Clock size={48} />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((txn) => (
              <div key={txn.id} className={`transaction-item ${txn.type}`}>
                <div className="txn-icon">
                  {txn.type === "credit" ? (
                    <TrendingUp size={20} className="credit-icon" />
                  ) : (
                    <Download size={20} className="debit-icon" />
                  )}
                </div>
                <div className="txn-details">
                  <p className="txn-description">{txn.description}</p>
                  {txn.commissionAmount > 0 && (
                    <p className="txn-date">
                      Go7 fee ({VENDOR_COMMISSION_PERCENT}%): ₦{txn.commissionAmount.toLocaleString()}
                    </p>
                  )}
                  <p className="txn-date">{formatDate(txn.timestamp)}</p>
                </div>
                <div className={`txn-amount ${txn.type}`}>
                  {txn.type === "credit" ? "+" : "-"}₦{Math.abs(txn.amount).toLocaleString()}
                  {txn.type === "debit" && txn.status === "paid" && (
                    <span className="txn-paid-badge">Sent</span>
                  )}
                  {txn.type === "debit" && txn.status === "pending" && (
                    <span className="txn-pending-badge">Sending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="commission-info">
        <h4>ℹ️ How It Works</h4>
        <ul>
          <li>Go7 takes {VENDOR_COMMISSION_PERCENT}% commission on food sales only (not delivery fees)</li>
          <li>Earnings are credited when orders are delivered</li>
          <li>Minimum withdrawal: ₦{VENDOR_MIN_WITHDRAWAL.toLocaleString()}</li>
          <li>Withdrawals are sent instantly to your bank via Paystack (usually 1–5 minutes)</li>
          <li>Keep your bank details up to date in Profile for smooth payouts</li>
        </ul>
      </div>
    </div>
  );
}
