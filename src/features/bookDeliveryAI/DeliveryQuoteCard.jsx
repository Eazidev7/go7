import React from 'react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

export default function DeliveryQuoteCard({ quote, onConfirm, onCancel, disabled }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between text-[13px] text-gray-500 mb-1">
        <span>Distance</span><span className="font-semibold text-gray-800">{quote.distanceKm} km</span>
      </div>
      <div className="flex items-center justify-between text-[13px] text-gray-500 mb-1">
        <span>Delivery fee</span><span className="font-semibold text-gray-800">{fmt(quote.deliveryFee)}</span>
      </div>
      <div className="flex items-center justify-between text-[13px] text-gray-500 mb-2">
        <span>Service fee</span><span className="font-semibold text-gray-800">{fmt(quote.platformFee)}</span>
      </div>
      <div className="border-t border-dashed border-gray-200 pt-2 flex items-center justify-between">
        <span className="text-[14px] font-bold text-gray-800">Total</span>
        <span className="text-[15px] font-bold text-[#E30613]">{fmt(quote.grandTotal)}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="flex-1 bg-[#E30613] text-white text-[13px] font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          Continue to payment
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="px-4 border border-gray-300 text-gray-600 text-[13px] font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
