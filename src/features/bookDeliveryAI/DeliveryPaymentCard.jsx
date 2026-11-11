import React from 'react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

/** Payment method picker (server-provided options only). */
export function PaymentOptionsCard({ options, onSelect, disabled }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm space-y-1.5">
      {options.map((o) => (
        <button
          key={o.method}
          onClick={() => onSelect(o.method)}
          disabled={disabled || !o.available}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-[#E30613] text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-lg">
            {o.method === 'paystack' ? '💳' : o.method === 'wallet' ? '👛' : '🤝'}
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-semibold text-gray-800">{o.label}</span>
            {o.method === 'wallet' && !o.available && (
              <span className="block text-[11px] text-gray-400">Insufficient balance</span>
            )}
          </span>
          <span className="text-gray-300">›</span>
        </button>
      ))}
    </div>
  );
}

/** Pay button shown after the booking is staged server-side. */
export function PaymentActionCard({ method, amount, onPay, onPaid, paying, disabled }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {method === 'pod' ? (
        <button
          onClick={onPay}
          disabled={disabled || paying}
          className="w-full bg-[#E30613] text-white text-[14px] font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {paying ? 'Confirming…' : 'Confirm booking — pay on delivery'}
        </button>
      ) : (
        <button
          onClick={onPay}
          disabled={disabled || paying}
          className="w-full bg-[#E30613] text-white text-[14px] font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {paying ? 'Processing…' : `Pay ${fmt(amount)} ${method === 'wallet' ? 'with Wallet' : 'securely'}`}
        </button>
      )}
      <p className="text-[11px] text-gray-400 text-center mt-2">
        Payment is verified on Go7 servers before dispatch.
      </p>
    </div>
  );
}

/** "Still finding a rider" indicator. */
export function FindingRiderCard({ onCheck, checking }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
      <div className="w-8 h-8 mx-auto mb-2 border-[3px] border-gray-200 border-t-[#E30613] rounded-full animate-spin" />
      <p className="text-[13px] text-gray-600 font-medium">Finding the nearest available rider…</p>
      <button
        onClick={onCheck}
        disabled={checking}
        className="mt-2 text-[12px] font-semibold text-[#E30613] disabled:opacity-50"
      >
        {checking ? 'Checking…' : 'Check again'}
      </button>
    </div>
  );
}

/** Track action — opens the existing tracking page. */
export function TrackingCard({ orderId, onOpen }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🛵</span>
        <div>
          <p className="text-[14px] font-semibold text-gray-800">Order {orderId}</p>
          <p className="text-[11px] text-gray-400">Live tracking available</p>
        </div>
      </div>
      <button
        onClick={onOpen}
        className="w-full bg-[#E30613] text-white text-[14px] font-semibold py-3 rounded-lg"
      >
        Track Delivery
      </button>
    </div>
  );
}
