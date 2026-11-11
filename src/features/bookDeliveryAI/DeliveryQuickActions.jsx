import React from 'react';

const DEFAULT_ACTIONS = [
  { emoji: '📦', label: 'Send a package', message: 'I want to send a package' },
  { emoji: '📄', label: 'Send documents', message: 'I want to send documents' },
  { emoji: '🍔', label: 'Send food', message: 'I want to send food' },
  { emoji: '🛍️', label: 'Shopping items', message: 'I want to send shopping items' },
  { emoji: '🎁', label: 'Send a gift', message: 'I want to send a gift' },
  { emoji: '💬', label: 'Something else', message: 'I want to send something' },
];

export default function DeliveryQuickActions({ onPick }) {
  return (
    <div className="mt-2">
      <p className="text-[13px] font-semibold text-gray-700 mb-2">What can I help you with?</p>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => onPick(a.message)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 font-medium hover:border-[#E30613] hover:text-[#E30613] transition-colors shadow-sm"
          >
            <span>{a.emoji}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
